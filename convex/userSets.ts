import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import * as Effect from "effect/Effect";
import { userSetRoleValidator } from "./schema";
import { SRS_DEFAULTS } from "./srs";
import { fail, ok, unauthenticated, notFound, forbidden, conflict } from "./domain/result";
import {
  fromAsyncDomainResult,
  fromDomainResult,
  requireAuth,
  requireEntity,
  toDomainResultAsync,
} from "./domain/effect";
import { validateStudySessionSetup, validateStudySessionSetupEffect } from "./domain/studySessionSetup";
import { getFieldDefinitions } from "./lib/typed";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";

// ---------------------------------------------------------------------------
// Access control helpers — used by other Convex function files
// ---------------------------------------------------------------------------

export async function assertMember(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">
) {
  const link = await ctx.db
    .query("userSets")
    .withIndex("by_userId_and_setId", (q) =>
      q.eq("userId", userId).eq("setId", setId)
    )
    .first();
  if (!link) return fail(notFound("Set not found"));
  return ok(link);
}

export async function assertOwner(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">
) {
  const link = await assertMember(ctx, userId, setId);
  if (!link.ok) return link;
  if (link.value.role !== "owner") return fail(forbidden("Only the set owner can do that."));
  return ok(link.value);
}

export function assertMemberEffect(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return fromAsyncDomainResult(assertMember(ctx, userId, setId));
}

export function assertOwnerEffect(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return fromAsyncDomainResult(assertOwner(ctx, userId, setId));
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

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
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
  },
});

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const add = mutation({
  args: {
    setId: v.id("flashcardSets"),
    role: userSetRoleValidator,
    srsEnabled: v.optional(v.boolean()),
    defaultFrontFields: v.array(v.string()),
    defaultBackFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));

    const existing = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (existing) return fail(conflict("Set already in library"));

    const srsEnabled = args.srsEnabled ?? true;
    const userSetId = await ctx.db.insert("userSets", {
      userId: identity.tokenIdentifier,
      setId: args.setId,
      role: args.role,
      srsEnabled,
      defaultFrontFields: args.defaultFrontFields,
      defaultBackFields: args.defaultBackFields,
      defaultTtsOnlyFields: [],
      createdAt: Date.now(),
    });

    if (srsEnabled) {
      await enrollCardsForSetHelper(ctx, identity.tokenIdentifier, args.setId);
    }

    return userSetId;
  },
});

export const update = mutation({
  args: {
    setId: v.id("flashcardSets"),
    srsEnabled: v.optional(v.boolean()),
    defaultFrontFields: v.optional(v.array(v.string())),
    defaultBackFields: v.optional(v.array(v.string())),
    defaultTtsOnlyFields: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const validated = await toDomainResultAsync(
      Effect.gen(function* () {
        const identity = yield* requireAuth(ctx);
        const link = yield* requireEntity(
          ctx.db
            .query("userSets")
            .withIndex("by_userId_and_setId", (q) =>
              q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
            )
            .first(),
          "Set not found",
        );
        const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");

        if (
          args.defaultFrontFields !== undefined ||
          args.defaultBackFields !== undefined ||
          args.defaultTtsOnlyFields !== undefined
        ) {
          yield* fromDomainResult(
            validateStudySessionSetup({
              fieldDefinitions: getFieldDefinitions(set),
              frontFields: args.defaultFrontFields ?? link.defaultFrontFields,
              backFields: args.defaultBackFields ?? link.defaultBackFields,
              ttsOnlyFields: args.defaultTtsOnlyFields ?? link.defaultTtsOnlyFields,
            }),
          );
        }
        return { identity, link };
      }),
    );
    if (!validated.ok) return validated;
    const { identity, link } = validated.value;

    const wasSrsEnabled = link.srsEnabled;
    const patch: {
      srsEnabled?: boolean;
      defaultFrontFields?: string[];
      defaultBackFields?: string[];
      defaultTtsOnlyFields?: string[];
    } = {};
    if (args.srsEnabled !== undefined) patch.srsEnabled = args.srsEnabled;
    if (args.defaultFrontFields !== undefined)
      patch.defaultFrontFields = args.defaultFrontFields;
    if (args.defaultBackFields !== undefined)
      patch.defaultBackFields = args.defaultBackFields;
    if (args.defaultTtsOnlyFields !== undefined)
      patch.defaultTtsOnlyFields = args.defaultTtsOnlyFields;

    await ctx.db.patch(link._id, patch);

    if (args.srsEnabled && !wasSrsEnabled) {
      await enrollCardsForSetHelper(ctx, identity.tokenIdentifier, args.setId);
    }
    return ok(null);
  },
});

export const remove = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());

    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (!link) return fail(notFound("Set not found"));

    await deleteAllMatching(ctx,
      () => ctx.db.query("srsCards").withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      ).take(DELETION_BATCH_SIZE),
      async (ctx, srsCard) => {
        await deleteAllMatching(ctx,
          () => ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id)).take(DELETION_BATCH_SIZE),
        );
      },
    );

    await ctx.db.delete(link._id);
    return ok(null);
  },
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export async function enrollCardsForSetHelper(
  ctx: MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">
) {
  const cards = await ctx.db
    .query("flashcards")
    .withIndex("by_setId", (q) => q.eq("setId", setId))
    .take(1000);

  for (const card of cards) {
    const existing = await ctx.db
      .query("srsCards")
      .withIndex("by_cardId_and_userId", (q) =>
        q.eq("cardId", card._id).eq("userId", userId)
      )
      .first();
    if (!existing) {
      await ctx.db.insert("srsCards", {
        userId,
        cardId: card._id,
        setId,
        easeFactor: SRS_DEFAULTS.INITIAL_EASE_FACTOR,
        interval: SRS_DEFAULTS.INITIAL_INTERVAL,
        repetitions: SRS_DEFAULTS.INITIAL_REPETITIONS,
        nextReviewAt: 0,
        status: "new",
      });
    }
  }
}

export const enrollCardsForSet = internalMutation({
  args: {
    userId: v.string(),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    await enrollCardsForSetHelper(ctx, args.userId, args.setId);
  },
});
