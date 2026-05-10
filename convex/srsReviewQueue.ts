import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ratingValidator } from "./schema";
import { computeSM2, computeNextReviewAt, computeDayStartMs, SRS_DEFAULTS } from "./srs";
import { populateQueue } from "./srsEngine";
import { RATING_SCORES } from "./studySessions";
import { incrementDailyStats } from "./progress";
import type { FieldDefinition } from "../src/lib/types";

export const getQueueStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const remaining = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .take(500);

    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    const dayResetUtcHour =
      userSettings?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
    const todayMs = computeDayStartMs(dayResetUtcHour);

    const todayReviews = await ctx.db
      .query("srsReviews")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(500);
    const reviewedToday = todayReviews.filter(
      (r) => r.timestamp >= todayMs
    ).length;

    return {
      remaining: remaining.length,
      reviewedToday,
      dayResetUtcHour,
    };
  },
});

export const getHydratedQueue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const queueItems = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .take(200);

    const setCache = new Map<string, {
      fieldDefinitions: FieldDefinition[];
    }>();
    const userSetCache = new Map<string, {
      defaultFrontFields: string[];
      defaultBackFields: string[];
      defaultTtsOnlyFields: string[];
    }>();

    const hydrated = [];
    for (const item of queueItems) {
      const card = await ctx.db.get(item.cardId);
      if (!card) continue;

      const setIdStr = item.setId;
      if (!setCache.has(setIdStr)) {
        const set = await ctx.db.get(item.setId);
        if (!set) continue;
        setCache.set(setIdStr, {
          fieldDefinitions: set.fieldDefinitions as FieldDefinition[],
        });
      }

      if (!userSetCache.has(setIdStr)) {
        const userSet = await ctx.db
          .query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", item.setId)
          )
          .first();
        if (!userSet) continue;
        userSetCache.set(setIdStr, {
          defaultFrontFields: userSet.defaultFrontFields,
          defaultBackFields: userSet.defaultBackFields,
          defaultTtsOnlyFields: userSet.defaultTtsOnlyFields ?? [],
        });
      }

      const setData = setCache.get(setIdStr)!;
      const userSetData = userSetCache.get(setIdStr)!;

      hydrated.push({
        _id: item._id,
        srsCardId: item.srsCardId,
        card: { _id: card._id, fields: card.fields },
        fieldDefinitions: setData.fieldDefinitions,
        frontFields: userSetData.defaultFrontFields,
        backFields: userSetData.defaultBackFields,
        ttsOnlyFields: userSetData.defaultTtsOnlyFields,
      });
    }

    return hydrated;
  },
});

export const recordReview = mutation({
  args: {
    srsCardId: v.id("srsCards"),
    rating: ratingValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const srsCard = await ctx.db.get(args.srsCardId);
    if (!srsCard || srsCard.userId !== identity.tokenIdentifier)
      throw new Error("SRS card not found");

    const queueItem = await ctx.db
      .query("reviewQueue")
      .withIndex("by_srsCardId", (q) => q.eq("srsCardId", args.srsCardId))
      .first();

    // Already reviewed (offline replay) — no-op
    if (!queueItem) return { remaining: 0 };

    const now = Date.now();
    const result = computeSM2({
      rating: args.rating,
      easeFactor: srsCard.easeFactor,
      interval: srsCard.interval,
      repetitions: srsCard.repetitions,
    });

    await ctx.db.patch(args.srsCardId, {
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      status: result.status,
      nextReviewAt: computeNextReviewAt(result.interval, now),
      lastReviewedAt: now,
    });

    await ctx.db.insert("srsReviews", {
      userId: identity.tokenIdentifier,
      cardId: queueItem.cardId,
      srsCardId: args.srsCardId,
      rating: args.rating,
      timestamp: now,
      newInterval: result.interval,
      newEaseFactor: result.easeFactor,
    });

    await ctx.db.delete(queueItem._id);

    const ratingScore = RATING_SCORES[args.rating] ?? 0;
    await incrementDailyStats(
      ctx,
      identity.tokenIdentifier,
      "srs",
      ratingScore
    );

    const remaining = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .take(500);

    return { remaining: remaining.length };
  },
});

export const forceRefreshQueue = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    const existing = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
      .take(1);
    if (existing.length > 0) {
      throw new Error("Queue is not empty");
    }

    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const newCardLimit =
      userSettings?.maxNewCardsPerDay ?? SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY;

    const added = await populateQueue(ctx, userId, newCardLimit);
    return { added };
  },
});
