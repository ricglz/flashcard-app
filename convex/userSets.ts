import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { userSetRoleValidator } from "./schema";
import { SRS_DEFAULTS } from "./srs";
import { fail, ok, unauthenticated, notFound, forbidden, conflict } from "./domain/result";
import { validateStudySessionSetup } from "./domain/studySessionSetup";
import { getFieldDefinitions } from "./lib/typed";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());

    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (!link) return fail(notFound("Set not found"));

    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));
    if (
      args.defaultFrontFields !== undefined ||
      args.defaultBackFields !== undefined ||
      args.defaultTtsOnlyFields !== undefined
    ) {
      const selection = validateStudySessionSetup({
        fieldDefinitions: getFieldDefinitions(set),
        frontFields: args.defaultFrontFields ?? link.defaultFrontFields,
        backFields: args.defaultBackFields ?? link.defaultBackFields,
        ttsOnlyFields: args.defaultTtsOnlyFields ?? link.defaultTtsOnlyFields ?? [],
      });
      if (!selection.ok) return selection;
    }

    const wasSrsEnabled = link.srsEnabled;
    const patch: Record<string, unknown> = {};
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

    // Delete srsCards for this user+set
    let batch = await ctx.db
      .query("srsCards")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .take(500);
    while (batch.length > 0) {
      for (const row of batch) {
        // Delete any review queue items for this srsCard
        const queueItems = await ctx.db
          .query("reviewQueue")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", row._id))
          .take(100);
        for (const qi of queueItems) {
          await ctx.db.delete(qi._id);
        }
        await ctx.db.delete(row._id);
      }
      batch = await ctx.db
        .query("srsCards")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
        )
        .take(500);
    }

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

export const backfillExistingSets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("flashcardSets").take(500);
    for (const set of sets) {
      const existing = await ctx.db
        .query("userSets")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", set.ownerId).eq("setId", set._id)
        )
        .first();
      if (existing) continue;

      const fieldDefs = getFieldDefinitions(set);
      const sorted = [...fieldDefs].sort((a, b) => a.order - b.order);
      const defaultFrontFields = sorted.length > 0 ? [sorted[0]!.name] : [];
      const defaultBackFields = sorted.slice(1).map((fd) => fd.name);

      await ctx.db.insert("userSets", {
        userId: set.ownerId,
        setId: set._id,
        role: "owner",
        srsEnabled: true,
        defaultFrontFields,
        defaultBackFields,
        createdAt: Date.now(),
      });
    }
  },
});
