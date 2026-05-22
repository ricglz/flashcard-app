import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { SRS_DEFAULTS } from "./srs";

const SEEDED_FIELD_DEFINITIONS = [
  { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
  { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
];

const seedCardValidator = v.object({
  front: v.string(),
  back: v.string(),
});

export const cleanupTestUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const sets = await ctx.db
      .query("flashcardSets")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .collect();
    for (const set of sets) {
      const cards = await ctx.db
        .query("flashcards")
        .withIndex("by_setId", (q) => q.eq("setId", set._id))
        .collect();
      for (const card of cards) await ctx.db.delete(card._id);

      const sessions = await ctx.db
        .query("studySessions")
        .withIndex("by_setId_and_userId", (q) =>
          q.eq("setId", set._id).eq("userId", userId),
        )
        .collect();
      for (const session of sessions) {
        const results = await ctx.db
          .query("cardResults")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const result of results) await ctx.db.delete(result._id);
        await ctx.db.delete(session._id);
      }
      await ctx.db.delete(set._id);
    }

    // Tables with by_userId index
    for (const table of ["userSets", "srsReviews", "userSettings", "cliAccessTokens", "cardAnnotations"] as const) {
      const docs = await ctx.db.query(table).withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
      for (const doc of docs) await ctx.db.delete(doc._id);
    }

    // Tables with compound userId indexes (prefix match)
    const srsCards = await ctx.db.query("srsCards").withIndex("by_userId_and_nextReviewAt", (q) => q.eq("userId", userId)).collect();
    for (const doc of srsCards) await ctx.db.delete(doc._id);

    const queue = await ctx.db.query("reviewQueue").withIndex("by_userId_and_order", (q) => q.eq("userId", userId)).collect();
    for (const doc of queue) await ctx.db.delete(doc._id);

    const stats = await ctx.db.query("dailyStats").withIndex("by_userId_and_dayKey", (q) => q.eq("userId", userId)).collect();
    for (const doc of stats) await ctx.db.delete(doc._id);
  },
});

export const seedFlashcardSet = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    cards: v.array(seedCardValidator),
    srsEnabled: v.optional(v.boolean()),
    queueSrsCards: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.cards.length === 0) {
      throw new Error("seedFlashcardSet requires at least one card");
    }
    if (args.cards.length > 50) {
      throw new Error("seedFlashcardSet accepts at most 50 cards");
    }

    const now = Date.now();
    const setId = await ctx.db.insert("flashcardSets", {
      name: args.name,
      ownerId: args.userId,
      fieldDefinitions: SEEDED_FIELD_DEFINITIONS,
      cardCount: args.cards.length,
      updatedAt: now,
      origin: { kind: "manual" },
      visibility: "private",
      createdAt: now,
    });

    await ctx.db.insert("userSets", {
      userId: args.userId,
      setId,
      role: "owner",
      srsEnabled: args.srsEnabled ?? false,
      defaultFrontFields: ["Front"],
      defaultBackFields: ["Back"],
      defaultTtsOnlyFields: [],
      createdAt: now,
    });

    const cardIds: Id<"flashcards">[] = [];
    for (const [order, card] of args.cards.entries()) {
      const cardId = await ctx.db.insert("flashcards", {
        setId,
        fields: { Front: card.front, Back: card.back },
        order,
        origin: "manual",
      });
      cardIds.push(cardId);
    }

    const srsCardIds: Id<"srsCards">[] = [];
    if (args.srsEnabled) {
      for (const cardId of cardIds) {
        const srsCardId = await ctx.db.insert("srsCards", {
          userId: args.userId,
          cardId,
          setId,
          easeFactor: SRS_DEFAULTS.INITIAL_EASE_FACTOR,
          interval: SRS_DEFAULTS.INITIAL_INTERVAL,
          repetitions: SRS_DEFAULTS.INITIAL_REPETITIONS,
          nextReviewAt: 0,
          status: "new",
        });
        srsCardIds.push(srsCardId);
      }
    }

    if (args.queueSrsCards) {
      if (!args.srsEnabled) {
        throw new Error("queueSrsCards requires srsEnabled");
      }
      for (const [order, srsCardId] of srsCardIds.entries()) {
        const cardId = cardIds[order];
        if (!cardId) continue;
        await ctx.db.insert("reviewQueue", {
          userId: args.userId,
          cardId,
          srsCardId,
          setId,
          queuedAt: now,
          order,
        });
      }
    }

    return {
      setId,
      cardIds,
      srsCardIds,
      queuedCount: args.queueSrsCards ? srsCardIds.length : 0,
    };
  },
});

export const getLatestStudySessionState = internalQuery({
  args: {
    userId: v.string(),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("studySessions")
      .withIndex("by_setId_and_userId", (q) =>
        q.eq("setId", args.setId).eq("userId", args.userId),
      )
      .order("desc")
      .first();
    if (!session) return null;

    const results = await ctx.db
      .query("cardResults")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .take(100);

    return {
      sessionId: session._id,
      status: session.status,
      currentIndex: session.currentIndex,
      completedAt: session.completedAt ?? null,
      resultCount: results.length,
    };
  },
});

export const getSrsState = internalQuery({
  args: {
    userId: v.string(),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const srsCards = await ctx.db
      .query("srsCards")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", args.userId).eq("setId", args.setId),
      )
      .take(100);

    const queue: Doc<"reviewQueue">[] = [];
    const reviews: Doc<"srsReviews">[] = [];
    for (const srsCard of srsCards) {
      queue.push(
        ...(await ctx.db
          .query("reviewQueue")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id))
          .take(10)),
      );
      reviews.push(
        ...(await ctx.db
          .query("srsReviews")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id))
          .take(10)),
      );
    }

    return {
      queueRemaining: queue.length,
      reviewCount: reviews.length,
      srsCards: srsCards.map((card) => ({
        srsCardId: card._id,
        cardId: card.cardId,
        status: card.status,
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        nextReviewAt: card.nextReviewAt,
        lastReviewedAt: card.lastReviewedAt ?? null,
      })),
      reviews: reviews.map((review) => ({
        srsCardId: review.srsCardId,
        rating: review.rating,
        newInterval: review.newInterval,
        newEaseFactor: review.newEaseFactor,
      })),
    };
  },
});
