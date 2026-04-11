import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fieldDefinitionValidator } from "./schema";

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
    return await ctx.db
      .query("flashcardSets")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.tokenIdentifier))
      .take(100);
  },
});

export const get = query({
  args: { id: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const set = await ctx.db.get(args.id);
    if (!set) return null;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || set.ownerId !== identity.tokenIdentifier) return null;
    return set;
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
    return await ctx.db.insert("flashcardSets", {
      name: args.name,
      description: args.description,
      fieldDefinitions: args.fieldDefinitions,
      ownerId: identity.tokenIdentifier,
      createdAt: Date.now(),
    });
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
    const set = await ctx.db.get(args.id);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");
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
    const set = await ctx.db.get(args.id);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");
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
    await ctx.db.delete(args.id);
  },
});
