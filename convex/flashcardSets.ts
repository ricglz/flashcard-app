import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import * as Effect from "effect/Effect";
import { fieldDefinitionValidator } from "./schema";
import { assertOwnerEffect } from "./userSets";
import type { Doc } from "./_generated/dataModel";
import {
  fail,
  forbidden,
  invalidInput,
  notFound,
  ok,
  unauthenticated,
  type CommonFailure,
  type DomainResult,
} from "./domain/result";
import {
  fromDomainResult,
  requireAuth,
  requireEntity,
  toDomainResultAsync,
} from "./domain/effect";
import {
  validateSetFields as validateSetFieldsResult,
  type SetFieldsValidationFailure,
} from "./domain/fieldDefinitions";
import type { FieldDefinition, PublicFlashcardSet } from "../src/lib/types";
import { isPublicFlashcardSet } from "../src/lib/types";
import { getFieldDefinitions } from "./lib/typed";
import { getDefaultFieldLayout } from "../src/lib/types";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";
import { createInitialCardsForSet, MAX_CARDS_PER_SET } from "./lib/cardCreation";

export type SetWithViewer = Doc<"flashcardSets"> & {
  viewer:
    | { role: "owner"; userSet: Doc<"userSets"> }
    | { role: "member"; userSet: Doc<"userSets"> }
    | { role: "visitor"; userSet: null };
};

function hasStructuralFieldDefinitionChange(
  current: readonly FieldDefinition[],
  next: readonly FieldDefinition[],
) {
  if (current.length !== next.length) return true;
  const currentNames = new Set(current.map((field) => field.name));
  return next.some((field) => !currentNames.has(field.name));
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const includeArchived = args.includeArchived ?? false;
    const target = 100;
    const result: Array<Doc<"flashcardSets"> & { userSet: Doc<"userSets"> }> = [];
    let cursor: string | null = null;
    while (result.length < target) {
      const page = await ctx.db
        .query("userSets")
        .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
        .paginate({ cursor, numItems: 100 });
      for (const link of page.page) {
        const set = await ctx.db.get(link.setId);
        if (!set) continue;
        if (!includeArchived && set.archivedAt !== undefined) continue;
        result.push({ ...set, userSet: link });
        if (result.length >= target) break;
      }
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    return ok(result);
  },
});

export const get = query({
  args: { id: v.id("flashcardSets") },
  handler: async (ctx, args): Promise<DomainResult<SetWithViewer, CommonFailure>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const set = await ctx.db.get(args.id);
    if (!set) return fail(notFound("Set not found"));
    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.id)
      )
      .first();
    if (link) {
      return ok({ ...set, viewer: { role: link.role, userSet: link } });
    }
    const visibility = set.visibility;
    if (visibility === "private") {
      return fail(forbidden("You do not have access to this set."));
    }
    return ok({ ...set, viewer: { role: "visitor" as const, userSet: null } });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    fieldDefinitions: v.array(fieldDefinitionValidator),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const validation = yield* fromDomainResult(
        validateSetFieldsResult(
          args.name,
          args.fieldDefinitions,
        ),
      );
      const fieldDefinitions = validation.fieldDefinitions ?? args.fieldDefinitions;
      const setId = yield* Effect.promise(() =>
        ctx.db.insert("flashcardSets", {
          name: validation.name ?? args.name,
          description: args.description?.trim() ?? undefined,
          fieldDefinitions,
          ownerId: identity.tokenIdentifier,
          origin: { kind: "manual" as const },
          visibility: "private",
          cardCount: 0,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        }),
      );
      const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(fieldDefinitions);
      yield* Effect.promise(() =>
        ctx.db.insert("userSets", {
          userId: identity.tokenIdentifier,
          setId,
          role: "owner",
          srsEnabled: true,
          defaultFrontFields,
          defaultBackFields,
          defaultTtsOnlyFields: [],
          createdAt: Date.now(),
        }),
      );
      return setId;
    }),
  ),
});

export const update = mutation({
  args: {
    id: v.id("flashcardSets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    fieldDefinitions: v.optional(v.array(fieldDefinitionValidator)),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.id);
      const set = yield* requireEntity(ctx.db.get(args.id), "Set not found");
      const validation = yield* fromDomainResult(
        validateSetFieldsResult(
          args.name,
          args.fieldDefinitions,
        ),
      );
      const patch: {
        name?: string;
        description?: string;
        fieldDefinitions?: FieldDefinition[];
      } = {};
      if (validation.name !== undefined) patch.name = validation.name;
      if (args.description !== undefined) patch.description = args.description.trim() || undefined;
      if (validation.fieldDefinitions !== undefined) {
        if (
          set.cardCount > 0 &&
          hasStructuralFieldDefinitionChange(
            getFieldDefinitions(set),
            validation.fieldDefinitions,
          )
        ) {
          return yield* Effect.fail(
            invalidInput("Field names cannot be added, removed, or renamed after cards exist."),
          );
        }
        patch.fieldDefinitions = validation.fieldDefinitions;
      }
      yield* Effect.promise(() => ctx.db.patch(args.id, patch));
      return null;
    }),
  ),
});

export const remove = mutation({
  args: { id: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.id);

      yield* Effect.promise(() =>
        deleteAllMatching(ctx,
          () => ctx.db.query("flashcards").withIndex("by_setId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
        ),
      );

      yield* Effect.promise(() =>
        deleteAllMatching(ctx,
          () => ctx.db.query("studySessions").withIndex("by_setId_and_userId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
          async (ctx, session) => {
            await deleteAllMatching(ctx,
              () => ctx.db.query("cardResults").withIndex("by_sessionId", (q) => q.eq("sessionId", session._id)).take(DELETION_BATCH_SIZE),
            );
          },
        ),
      );

      yield* Effect.promise(() =>
        deleteAllMatching(ctx,
          () => ctx.db.query("srsCards").withIndex("by_setId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
          async (ctx, srsCard) => {
            await deleteAllMatching(ctx,
              () => ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id)).take(DELETION_BATCH_SIZE),
            );
          },
        ),
      );

      yield* Effect.promise(() =>
        deleteAllMatching(ctx,
          () => ctx.db.query("userSets").withIndex("by_setId", (q) => q.eq("setId", args.id)).take(DELETION_BATCH_SIZE),
        ),
      );

      yield* requireEntity(ctx.db.get(args.id), "Set not found");
      yield* Effect.promise(() => ctx.db.delete(args.id));
      return null;
    }),
  ),
});

export type FlashcardSetMutationFailure = CommonFailure | SetFieldsValidationFailure;

export const getForkSyncStatus = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));
    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId),
      )
      .first();
    if (!link && set.visibility === "private") {
      return fail(forbidden("You do not have access to this set."));
    }
    const origin = set.origin;
    if (origin.kind !== "forked") return ok(null);
    const { sourceSetId, forkedAt } = origin;
    const source = await ctx.db.get(sourceSetId);
    if (!source) return ok({ sourceDeleted: true, sourceUpdated: false });
    const sourceUpdatedAt = source.updatedAt;
    return ok({
      sourceDeleted: false,
      sourceUpdated: sourceUpdatedAt > forkedAt,
      sourceCardCount: source.cardCount,
      forkedAt,
    });
  },
});

export const listPublic = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [] as PublicFlashcardSet[], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("flashcardSets")
      .withIndex("by_visibility_and_createdAt", (q) =>
        q.eq("visibility", "public")
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.filter(isPublicFlashcardSet) };
  },
});

export const searchPublic = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as PublicFlashcardSet[];
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const results = await ctx.db
      .query("flashcardSets")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm).eq("visibility", "public")
      )
      .take(limit);
    return results.filter(isPublicFlashcardSet);
  },
});

export const searchPublicCombined = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as PublicFlashcardSet[];
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const [byName, byDesc] = await Promise.all([
      ctx.db
        .query("flashcardSets")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.searchTerm).eq("visibility", "public")
        )
        .take(limit),
      ctx.db
        .query("flashcardSets")
        .withSearchIndex("search_description", (q) =>
          q.search("description", args.searchTerm).eq("visibility", "public")
        )
        .take(limit),
    ]);
    const seen = new Set<string>();
    const merged: PublicFlashcardSet[] = [];
    for (const set of [...byName, ...byDesc]) {
      const id = set._id as string;
      if (!seen.has(id)) {
        seen.add(id);
        if (isPublicFlashcardSet(set)) merged.push(set);
      }
    }
    return merged.slice(0, limit);
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
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.id);
      const set = yield* requireEntity(ctx.db.get(args.id), "Set not found");
      if (set.archivedAt !== undefined && args.visibility !== "private") {
        return yield* Effect.fail(invalidInput("Archived sets can only be private."));
      }
      yield* Effect.promise(() => ctx.db.patch(args.id, { visibility: args.visibility }));
      return null;
    }),
  ),
});

export const fork = mutation({
  args: { sourceSetId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const sourceSet = yield* requireEntity(ctx.db.get(args.sourceSetId), "Source set not found.");

      if (sourceSet.ownerId === identity.tokenIdentifier) {
        return yield* Effect.fail({
          _tag: "Conflict" as const,
          message: "You cannot fork your own set.",
        });
      }

      const link = yield* Effect.promise(() =>
        ctx.db
          .query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", args.sourceSetId)
          )
          .first(),
      );
      const visibility = sourceSet.visibility;
      if (!link && visibility === "private") {
        return yield* Effect.fail({
          _tag: "Forbidden" as const,
          message: "Cannot fork a private set.",
        });
      }

      const now = Date.now();
      const sourceCards = yield* Effect.promise(() =>
        ctx.db
          .query("flashcards")
          .withIndex("by_setId", (q) => q.eq("setId", args.sourceSetId))
          .take(MAX_CARDS_PER_SET),
      );
      const activeSourceCards = sourceCards.filter((card) => card.archivedAt === undefined);

      const newSetId = yield* Effect.promise(() =>
        ctx.db.insert("flashcardSets", {
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
          cardCount: activeSourceCards.length,
          updatedAt: now,
          createdAt: now,
        }),
      );

      const fieldDefs = getFieldDefinitions(sourceSet);
      const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(fieldDefs);
      yield* Effect.promise(() =>
        ctx.db.insert("userSets", {
          userId: identity.tokenIdentifier,
          setId: newSetId,
          role: "owner",
          srsEnabled: true,
          defaultFrontFields,
          defaultBackFields,
          defaultTtsOnlyFields: [],
          createdAt: now,
        }),
      );

      yield* fromDomainResult(
        yield* Effect.promise(() =>
          createInitialCardsForSet(ctx, {
            set: {
              _id: newSetId,
              cardCount: activeSourceCards.length,
              fieldDefinitions: sourceSet.fieldDefinitions,
              updatedAt: now,
            },
            cards: activeSourceCards.map((card) => ({
              fields: card.fields,
              order: card.order,
            })),
            origin: { kind: "forked", sourceSetId: args.sourceSetId },
            srsEnrollment: {
              kind: "specificUser",
              userId: identity.tokenIdentifier,
            },
          }),
        ),
      );

      return newSetId;
    }),
  ),
});

export const unarchive = mutation({
  args: { id: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.id);
      const set = yield* requireEntity(ctx.db.get(args.id), "Set not found");
      if (set.archivedAt === undefined) {
        return yield* Effect.fail(invalidInput("Set is not archived."));
      }
      yield* Effect.promise(() => ctx.db.patch(args.id, { archivedAt: undefined }));
      return null;
    }),
  ),
});
