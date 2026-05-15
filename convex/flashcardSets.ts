import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { fieldDefinitionValidator } from "./schema";
import { assertOwner, enrollCardsForSetHelper } from "./userSets";
import { fail, ok, unauthenticated, notFound, forbidden, conflict, type CommonFailure } from "./domain/result";
import {
  validateSetFields as validateSetFieldsResult,
  type SetFieldsValidationFailure,
} from "./domain/fieldDefinitions";
import type { FieldDefinition } from "../src/lib/types";
import { getFieldDefinitions } from "./lib/typed";
import { getDefaultFieldLayout } from "../src/lib/types";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";

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
    const visibility = set.visibility ?? "private";
    if (visibility === "private") return null;
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
      cardCount: 0,
      createdAt: Date.now(),
    });

    const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(fieldDefinitions);

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
    await ctx.db.patch(args.id, { ...patch, updatedAt: Date.now() });
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

    await deleteAllMatching(ctx,
      () => ctx.db.query("flashcards").withIndex("by_setId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
    );

    await deleteAllMatching(ctx,
      () => ctx.db.query("studySessions").withIndex("by_setId_and_userId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
      async (ctx, session) => {
        await deleteAllMatching(ctx,
          () => ctx.db.query("cardResults").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).take(DELETION_BATCH_SIZE),
        );
      },
    );

    await deleteAllMatching(ctx,
      () => ctx.db.query("srsCards").withIndex("by_setId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
      async (ctx, srsCard) => {
        await deleteAllMatching(ctx,
          () => ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id)).take(DELETION_BATCH_SIZE),
        );
      },
    );

    await deleteAllMatching(ctx,
      () => ctx.db.query("userSets").withIndex("by_setId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
    );

    const set = await ctx.db.get(args.id);
    if (!set) return fail(notFound("Set not found"));
    await ctx.db.delete(args.id);
    return ok(null);
  },
});

export type FlashcardSetMutationFailure = CommonFailure | SetFieldsValidationFailure;

export const getForkSyncStatus = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const set = await ctx.db.get(args.setId);
    const origin = set?.origin;
    if (!set || origin?.kind !== "forked") return null;
    const { sourceSetId, forkedAt } = origin;
    const source = await ctx.db.get(sourceSetId);
    if (!source) return { sourceDeleted: true, sourceUpdated: false };
    const sourceUpdatedAt = source.updatedAt ?? source._creationTime;
    return {
      sourceDeleted: false,
      sourceUpdated: sourceUpdatedAt > forkedAt,
      sourceCardCount: source.cardCount ?? 0,
      forkedAt,
    };
  },
});

export const listPublic = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };
    return await ctx.db
      .query("flashcardSets")
      .withIndex("by_visibility_and_createdAt", (q) =>
        q.eq("visibility", "public")
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchPublic = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    return await ctx.db
      .query("flashcardSets")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm).eq("visibility", "public")
      )
      .take(limit);
  },
});

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

export const fork = mutation({
  args: { sourceSetId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());

    const sourceSet = await ctx.db.get(args.sourceSetId);
    if (!sourceSet) return fail(notFound("Source set not found."));

    if (sourceSet.ownerId === identity.tokenIdentifier) {
      return fail(conflict("You cannot fork your own set."));
    }

    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.sourceSetId)
      )
      .first();
    const visibility = sourceSet.visibility ?? "private";
    if (!link && visibility === "private") {
      return fail(forbidden("Cannot fork a private set."));
    }

    const now = Date.now();
    const sourceCards = await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.sourceSetId))
      .take(1000);

    const newSetId = await ctx.db.insert("flashcardSets", {
      name: `Copy of ${sourceSet.name}`,
      description: sourceSet.description,
      ownerId: identity.tokenIdentifier,
      fieldDefinitions: sourceSet.fieldDefinitions,
      origin: {
        kind: "forked" as const,
        sourceSetId: args.sourceSetId,
        forkedAt: now,
      },
      visibility: "private",
      cardCount: sourceCards.length,
      createdAt: now,
    });

    for (const card of sourceCards) {
      await ctx.db.insert("flashcards", {
        setId: newSetId,
        fields: card.fields,
        order: card.order,
      });
    }

    const fieldDefs = getFieldDefinitions(sourceSet);
    const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(fieldDefs);
    await ctx.db.insert("userSets", {
      userId: identity.tokenIdentifier,
      setId: newSetId,
      role: "owner",
      srsEnabled: true,
      defaultFrontFields,
      defaultBackFields,
      createdAt: now,
    });

    await enrollCardsForSetHelper(ctx, identity.tokenIdentifier, newSetId);

    return ok(newSetId);
  },
});
