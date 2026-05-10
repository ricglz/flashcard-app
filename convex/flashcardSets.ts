import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fieldDefinitionValidator } from "./schema";
import { assertOwner } from "./userSets";

export function validateSetFields(
  name: string | undefined,
  fieldDefinitions: Array<{ name: string }> | undefined
) {
  if (name !== undefined && name.trim().length === 0) {
    throw new Error("Set name must not be empty");
  }
  if (fieldDefinitions !== undefined) {
    if (fieldDefinitions.length === 0) {
      throw new Error("At least one field definition is required");
    }
    const names = fieldDefinitions.map((fd) => fd.name.trim());
    if (names.some((n) => n.length === 0)) {
      throw new Error("Field names must not be empty");
    }
    if (new Set(names).size !== names.length) {
      throw new Error("Field names must be unique");
    }
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const links = await ctx.db
      .query("userSets")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(100);
    const sets = await Promise.all(
      links.map(async (link) => {
        const set = await ctx.db.get(link.setId);
        if (!set) return null;
        return { ...set, userSet: link };
      })
    );
    return sets.filter((s) => s !== null);
  },
});

export const get = query({
  args: { id: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const set = await ctx.db.get(args.id);
    if (!set) return null;
    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.id)
      )
      .first();
    if (link) {
      return { ...set, viewer: { role: link.role, userSet: link } };
    }
    return { ...set, viewer: { role: "visitor" as const, userSet: null } };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    fieldDefinitions: v.array(fieldDefinitionValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    validateSetFields(args.name, args.fieldDefinitions);
    const setId = await ctx.db.insert("flashcardSets", {
      name: args.name,
      description: args.description,
      fieldDefinitions: args.fieldDefinitions,
      ownerId: identity.tokenIdentifier,
      createdAt: Date.now(),
    });

    const sorted = [...args.fieldDefinitions].sort((a, b) => a.order - b.order);
    const defaultFrontFields = sorted.length > 0 ? [sorted[0].name] : [];
    const defaultBackFields = sorted.slice(1).map((fd) => fd.name);

    await ctx.db.insert("userSets", {
      userId: identity.tokenIdentifier,
      setId,
      role: "owner",
      srsEnabled: true,
      defaultFrontFields,
      defaultBackFields,
      createdAt: Date.now(),
    });

    return setId;
  },
});

export const update = mutation({
  args: {
    id: v.id("flashcardSets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    fieldDefinitions: v.optional(v.array(fieldDefinitionValidator)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await assertOwner(ctx, identity.tokenIdentifier, args.id);
    validateSetFields(args.name, args.fieldDefinitions);
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await assertOwner(ctx, identity.tokenIdentifier, args.id);

    // Delete cards in batches
    let cardBatch = await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.id))
      .take(500);
    while (cardBatch.length > 0) {
      for (const card of cardBatch) {
        await ctx.db.delete(card._id);
      }
      cardBatch = await ctx.db
        .query("flashcards")
        .withIndex("by_setId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    // Delete sessions and their card results
    let sessionBatch = await ctx.db
      .query("studySessions")
      .withIndex("by_setId_and_userId", (q) => q.eq("setId", args.id))
      .take(500);
    while (sessionBatch.length > 0) {
      for (const session of sessionBatch) {
        let resultBatch = await ctx.db
          .query("cardResults")
          .withIndex("by_sessionId", (q) =>
            q.eq("sessionId", session._id)
          )
          .take(500);
        while (resultBatch.length > 0) {
          for (const result of resultBatch) {
            await ctx.db.delete(result._id);
          }
          resultBatch = await ctx.db
            .query("cardResults")
            .withIndex("by_sessionId", (q) =>
              q.eq("sessionId", session._id)
            )
            .take(500);
        }
        await ctx.db.delete(session._id);
      }
      sessionBatch = await ctx.db
        .query("studySessions")
        .withIndex("by_setId_and_userId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    // Delete SRS data for all users linked to this set
    let srsBatch = await ctx.db
      .query("srsCards")
      .withIndex("by_setId", (q) => q.eq("setId", args.id))
      .take(500);
    while (srsBatch.length > 0) {
      for (const srsCard of srsBatch) {
        const queueItems = await ctx.db
          .query("reviewQueue")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id))
          .take(100);
        for (const qi of queueItems) {
          await ctx.db.delete(qi._id);
        }
        await ctx.db.delete(srsCard._id);
      }
      srsBatch = await ctx.db
        .query("srsCards")
        .withIndex("by_setId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    // Delete userSets links
    let linkBatch = await ctx.db
      .query("userSets")
      .withIndex("by_setId", (q) => q.eq("setId", args.id))
      .take(500);
    while (linkBatch.length > 0) {
      for (const link of linkBatch) {
        await ctx.db.delete(link._id);
      }
      linkBatch = await ctx.db
        .query("userSets")
        .withIndex("by_setId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    await ctx.db.delete(args.id);
  },
});
