import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fieldDefinitionValidator } from "./schema";
import { assertOwner } from "./userSets";
import { fail, ok, unauthenticated, notFound, type CommonFailure } from "./domain/result";
import {
  validateSetFields as validateSetFieldsResult,
  type SetFieldsValidationFailure,
} from "./domain/fieldDefinitions";
import type { FieldDefinition } from "../src/lib/types";

export function validateSetFields(
  name: string | undefined,
  fieldDefinitions: FieldDefinition[] | undefined
) {
  const result = validateSetFieldsResult(name, fieldDefinitions);
  if (!result.ok) throw new Error(result.error.message);
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
    if (!identity) return fail(unauthenticated());

    const validation = validateSetFieldsResult(
      args.name,
      args.fieldDefinitions as FieldDefinition[]
    );
    if (!validation.ok) return validation;

    const fieldDefinitions = validation.value.fieldDefinitions!;
    const setId = await ctx.db.insert("flashcardSets", {
      name: validation.value.name!,
      description: args.description?.trim() || undefined,
      fieldDefinitions,
      ownerId: identity.tokenIdentifier,
      origin: { kind: "manual" as const },
      createdAt: Date.now(),
    });

    const sorted = [...fieldDefinitions].sort((a, b) => a.order - b.order);
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
    if (!identity) return fail(unauthenticated());
    const owner = await assertOwner(ctx, identity.tokenIdentifier, args.id);
    if (!owner.ok) return owner;

    const validation = validateSetFieldsResult(
      args.name,
      args.fieldDefinitions as FieldDefinition[] | undefined
    );
    if (!validation.ok) return validation;

    const patch: {
      name?: string;
      description?: string;
      fieldDefinitions?: FieldDefinition[];
    } = {};
    if (validation.value.name !== undefined) patch.name = validation.value.name;
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (validation.value.fieldDefinitions !== undefined) {
      patch.fieldDefinitions = validation.value.fieldDefinitions;
    }
    await ctx.db.patch(args.id, patch);
    return ok(null);
  },
});

export const remove = mutation({
  args: { id: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const owner = await assertOwner(ctx, identity.tokenIdentifier, args.id);
    if (!owner.ok) return owner;

    let cardBatch = await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.id))
      .take(500);
    while (cardBatch.length > 0) {
      for (const card of cardBatch) await ctx.db.delete(card._id);
      cardBatch = await ctx.db
        .query("flashcards")
        .withIndex("by_setId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    let sessionBatch = await ctx.db
      .query("studySessions")
      .withIndex("by_setId_and_userId", (q) => q.eq("setId", args.id))
      .take(500);
    while (sessionBatch.length > 0) {
      for (const session of sessionBatch) {
        let resultBatch = await ctx.db
          .query("cardResults")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
          .take(500);
        while (resultBatch.length > 0) {
          for (const result of resultBatch) await ctx.db.delete(result._id);
          resultBatch = await ctx.db
            .query("cardResults")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
            .take(500);
        }
        await ctx.db.delete(session._id);
      }
      sessionBatch = await ctx.db
        .query("studySessions")
        .withIndex("by_setId_and_userId", (q) => q.eq("setId", args.id))
        .take(500);
    }

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
        for (const qi of queueItems) await ctx.db.delete(qi._id);
        await ctx.db.delete(srsCard._id);
      }
      srsBatch = await ctx.db
        .query("srsCards")
        .withIndex("by_setId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    let linkBatch = await ctx.db
      .query("userSets")
      .withIndex("by_setId", (q) => q.eq("setId", args.id))
      .take(500);
    while (linkBatch.length > 0) {
      for (const link of linkBatch) await ctx.db.delete(link._id);
      linkBatch = await ctx.db
        .query("userSets")
        .withIndex("by_setId", (q) => q.eq("setId", args.id))
        .take(500);
    }

    const set = await ctx.db.get(args.id);
    if (!set) return fail(notFound("Set not found"));
    await ctx.db.delete(args.id);
    return ok(null);
  },
});

export type FlashcardSetMutationFailure = CommonFailure | SetFieldsValidationFailure;

export const updateVisibility = mutation({
  args: {
    id: v.id("flashcardSets"),
    visibility: v.union(
      v.literal("private"),
      v.literal("unlisted"),
      v.literal("public")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const owner = await assertOwner(ctx, identity.tokenIdentifier, args.id);
    if (!owner.ok) return owner;

    await ctx.db.patch(args.id, { visibility: args.visibility });
    return ok(null);
  },
});
