import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ratingValidator } from "./schema";
import { computeSM2, computeNextReviewAt } from "./srs";
import type { CardRating } from "../src/lib/types";

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

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

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
      fieldDefinitions: Array<{ name: string; role: string; metadata: Record<string, unknown>; order: number }>;
    }>();
    const userSetCache = new Map<string, {
      defaultFrontFields: string[];
      defaultBackFields: string[];
    }>();

    const hydrated = [];
    for (const item of queueItems) {
      const card = await ctx.db.get(item.cardId);
      if (!card) continue;

      const setIdStr = item.setId as string;
      if (!setCache.has(setIdStr)) {
        const set = await ctx.db.get(item.setId);
        if (!set) continue;
        setCache.set(setIdStr, {
          fieldDefinitions: set.fieldDefinitions as Array<{
            name: string; role: string; metadata: Record<string, unknown>; order: number;
          }>,
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
      });
    }

    return hydrated;
  },
});

export const recordReview = mutation({
  args: {
    queueItemId: v.id("reviewQueue"),
    rating: ratingValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const queueItem = await ctx.db.get(args.queueItemId);
    if (!queueItem || queueItem.userId !== identity.tokenIdentifier)
      throw new Error("Not found");

    const srsCard = await ctx.db.get(queueItem.srsCardId);
    if (!srsCard) throw new Error("SRS card not found");

    const now = Date.now();
    const result = computeSM2({
      rating: args.rating as CardRating,
      easeFactor: srsCard.easeFactor,
      interval: srsCard.interval,
      repetitions: srsCard.repetitions,
    });

    await ctx.db.patch(queueItem.srsCardId, {
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
      srsCardId: queueItem.srsCardId,
      rating: args.rating,
      timestamp: now,
      newInterval: result.interval,
      newEaseFactor: result.easeFactor,
    });

    await ctx.db.delete(args.queueItemId);

    const remaining = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .take(500);

    return { remaining: remaining.length };
  },
});
