import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Effect from "effect/Effect";
import { ratingValidator } from "./schema";
import { computeSM2, computeNextReviewAt, computeDayStartMs, SRS_DEFAULTS } from "./srs";
import { populateQueue } from "./srsEngine";
import { CARD_RATING_SCORES } from "../src/lib/types";
import { incrementDailyStats } from "./progress";
import { notFound, conflict } from "./domain/result";
import { requireAuth, toDomainResultAsync } from "./domain/effect";
import type { FieldDefinition } from "../src/lib/types";
import { getFieldDefinitions } from "./lib/typed";

export const getQueueStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const remaining = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(500);

    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    const dayResetUtcHour = userSettings?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
    const todayMs = computeDayStartMs(dayResetUtcHour);

    const todayReviews = await ctx.db
      .query("srsReviews")
      .withIndex("by_userId_and_timestamp", (q) =>
        q.eq("userId", identity.tokenIdentifier).gte("timestamp", todayMs)
      )
      .take(500);

    return { remaining: remaining.length, reviewedToday: todayReviews.length, dayResetUtcHour };
  },
});

export const getHydratedQueue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const queueItems = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(200);
    if (queueItems.length === 0) return [];

    const uniqueSetIds = [...new Set(queueItems.map((qi) => qi.setId))];
    const perSetData = await Promise.all(
      uniqueSetIds.map(async (setId) => {
        const [set, userSet, cards] = await Promise.all([
          ctx.db.get(setId),
          ctx.db
            .query("userSets")
            .withIndex("by_userId_and_setId", (q) =>
              q.eq("userId", identity.tokenIdentifier).eq("setId", setId)
            )
            .first(),
          ctx.db.query("flashcards").withIndex("by_setId", (q) => q.eq("setId", setId)).take(1000),
        ]);
        return { setId, set, userSet, cards };
      })
    );

    const cardMap = new Map<string, { _id: string; fields: Record<string, string> }>();
    const setMap = new Map<string, { name: string; fieldDefinitions: FieldDefinition[] }>();
    const userSetMap = new Map<string, { defaultFrontFields: string[]; defaultBackFields: string[]; defaultTtsOnlyFields: string[] }>();

    for (const { setId, set, userSet, cards } of perSetData) {
      if (!set || !userSet) continue;
      for (const card of cards) cardMap.set(card._id, { _id: card._id, fields: card.fields });
      setMap.set(setId, { name: set.name, fieldDefinitions: getFieldDefinitions(set) });
      userSetMap.set(setId, {
        defaultFrontFields: userSet.defaultFrontFields,
        defaultBackFields: userSet.defaultBackFields,
        defaultTtsOnlyFields: userSet.defaultTtsOnlyFields,
      });
    }

    const hydrated = [];
    for (const item of queueItems) {
      const card = cardMap.get(item.cardId);
      const setData = setMap.get(item.setId);
      const userSetData = userSetMap.get(item.setId);
      if (!card || !setData || !userSetData) continue;
      hydrated.push({
        _id: item._id,
        srsCardId: item.srsCardId,
        setId: item.setId,
        setName: setData.name,
        card,
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
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);

      const srsCard = yield* Effect.promise(() => ctx.db.get(args.srsCardId));
      if (!srsCard || srsCard.userId !== identity.tokenIdentifier) {
        return yield* Effect.fail(notFound("SRS card not found"));
      }

      const queueItems = yield* Effect.promise(() =>
        ctx.db.query("reviewQueue")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", args.srsCardId))
          .take(10),
      );
      const queueItem = queueItems.find(
        (item) => item.userId === identity.tokenIdentifier,
      );

      if (!queueItem) {
        if (queueItems.length > 0) {
          return yield* Effect.fail(notFound("Review queue item not found"));
        }
        const remaining = yield* Effect.promise(() =>
          ctx.db.query("reviewQueue")
            .withIndex("by_userId_and_order", (q) =>
              q.eq("userId", identity.tokenIdentifier),
            )
            .take(500),
        );
        return { remaining: remaining.length, outcome: "duplicate" as const };
      }

      if (
        queueItem.cardId !== srsCard.cardId ||
        queueItem.setId !== srsCard.setId ||
        queueItem.srsCardId !== srsCard._id
      ) {
        return yield* Effect.fail(notFound("Review queue item not found"));
      }

      const now = Date.now();
      const result = computeSM2({
        rating: args.rating,
        easeFactor: srsCard.easeFactor,
        interval: srsCard.interval,
        repetitions: srsCard.repetitions,
      });

      yield* Effect.promise(() =>
        ctx.db.patch(args.srsCardId, {
          easeFactor: result.easeFactor,
          interval: result.interval,
          repetitions: result.repetitions,
          status: result.status,
          nextReviewAt: computeNextReviewAt(result.interval, now),
          lastReviewedAt: now,
        }),
      );

      yield* Effect.promise(() =>
        ctx.db.insert("srsReviews", {
          userId: identity.tokenIdentifier,
          cardId: queueItem.cardId,
          srsCardId: args.srsCardId,
          rating: args.rating,
          timestamp: now,
          newInterval: result.interval,
          newEaseFactor: result.easeFactor,
        }),
      );

      yield* Effect.promise(() => ctx.db.delete(queueItem._id));
      yield* Effect.promise(() =>
        incrementDailyStats(ctx, identity.tokenIdentifier, "srs", CARD_RATING_SCORES[args.rating]),
      );

      const remaining = yield* Effect.promise(() =>
        ctx.db.query("reviewQueue")
          .withIndex("by_userId_and_order", (q) => q.eq("userId", identity.tokenIdentifier))
          .take(500),
      );

      return { remaining: remaining.length, outcome: "recorded" as const };
    }),
  ),
});

export const forceRefreshQueue = mutation({
  args: {},
  handler: (ctx) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const userId = identity.tokenIdentifier;

      const existing = yield* Effect.promise(() =>
        ctx.db.query("reviewQueue")
          .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
          .take(1),
      );
      if (existing.length > 0) {
        return yield* Effect.fail(conflict("Queue is not empty"));
      }

      const userSettings = yield* Effect.promise(() =>
        ctx.db.query("userSettings")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .first(),
      );
      const newCardLimit = userSettings?.maxNewCardsPerDay ?? SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY;

      const added = yield* Effect.promise(() => populateQueue(ctx, userId, newCardLimit));
      return { added };
    }),
  ),
});
