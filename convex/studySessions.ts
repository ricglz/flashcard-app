import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ratingValidator } from "./schema";
import { assertMember } from "./userSets";
import { incrementDailyStats } from "./progress";
import { validateStudySessionSetup, type StudySessionSetupFailure } from "./domain/studySessionSetup";
import { fail, unauthenticated, notFound, conflict, type CommonFailure } from "./domain/result";
import type { CardRating } from "../src/lib/types";
import { getFieldDefinitions } from "./lib/typed";

export const RATING_SCORES: Record<CardRating, number> = {
  wrong: 0,
  hard: 1,
  good: 2,
  easy: 3,
};

/** Compute overall score from an array of card result ratings. */
export function computeOverallScore(
  ratings: Array<{ rating: CardRating }>
): number {
  if (ratings.length === 0) return 0;
  const totalScore = ratings.reduce(
    (sum, r) => sum + RATING_SCORES[r.rating],
    0
  );
  const maxScore = ratings.length * 3;
  return maxScore > 0 ? totalScore / maxScore : 0;
}

export const getActiveSession = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const session = await ctx.db
      .query("studySessions")
      .withIndex("by_setId_and_userId_and_status", (q) =>
        q
          .eq("setId", args.setId)
          .eq("userId", identity.tokenIdentifier)
          .eq("status", "in_progress")
      )
      .first();
    if (!session || session.status !== "in_progress") return null;
    return session;
  },
});

export const get = query({
  args: { id: v.id("studySessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== identity.tokenIdentifier) return null;
    return session;
  },
});

export const getResults = query({
  args: { sessionId: v.id("studySessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.tokenIdentifier) return null;
    const results = await ctx.db
      .query("cardResults")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .take(1000);
    return { session, results };
  },
});

export const start = mutation({
  args: {
    setId: v.id("flashcardSets"),
    frontFields: v.array(v.string()),
    backFields: v.array(v.string()),
    ttsOnlyFields: v.optional(v.array(v.string())),
    shuffle: v.boolean(),
    cardLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));
    const member = await assertMember(ctx, identity.tokenIdentifier, args.setId);
    if (!member.ok) return member;

    const existingActive = await ctx.db
      .query("studySessions")
      .withIndex("by_setId_and_userId_and_status", (q) =>
        q
          .eq("setId", args.setId)
          .eq("userId", identity.tokenIdentifier)
          .eq("status", "in_progress")
      )
      .first();
    if (existingActive) return existingActive._id;

    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.setId))
      .take(1000);

    const setupResult = validateStudySessionSetup({
      fieldDefinitions: getFieldDefinitions(set),
      frontFields: args.frontFields,
      backFields: args.backFields,
      ttsOnlyFields: args.ttsOnlyFields,
      cardLimit: args.cardLimit,
      availableCardCount: cards.length,
    });
    if (!setupResult.ok) return setupResult;
    const setup = setupResult.value;

    let cardOrder = cards
      .sort((a, b) => a.order - b.order)
      .map((c) => c._id);

    if (args.shuffle) {
      for (let i = cardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
      }
    }

    if (setup.cardLimit !== undefined && setup.cardLimit < cardOrder.length) {
      cardOrder = cardOrder.slice(0, setup.cardLimit);
    }

    const id = await ctx.db.insert("studySessions", {
      setId: args.setId,
      userId: identity.tokenIdentifier,
      frontFields: setup.frontFields,
      backFields: setup.backFields,
      ttsOnlyFields: setup.ttsOnlyFields,
      cardOrder,
      currentIndex: 0,
      status: "in_progress",
      startedAt: Date.now(),
    });
    return id;
  },
});

export const recordResult = mutation({
  args: {
    sessionId: v.id("studySessions"),
    cardId: v.id("flashcards"),
    rating: ratingValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.tokenIdentifier) {
      return fail(notFound("Session not found"));
    }
    if (session.status !== "in_progress") {
      return { isComplete: true, outcome: "alreadyComplete" as const };
    }

    const expectedCardId = session.cardOrder[session.currentIndex];
    if (args.cardId !== expectedCardId) {
      const alreadyRecorded = await ctx.db
        .query("cardResults")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
        .take(1000);
      if (alreadyRecorded.some((result) => result.cardId === args.cardId)) {
        return { isComplete: false, outcome: "duplicate" as const };
      }
      return fail(conflict("cardId does not match the current card in the session"));
    }

    await ctx.db.insert("cardResults", {
      sessionId: args.sessionId,
      cardId: args.cardId,
      rating: args.rating,
      timestamp: Date.now(),
    });

    const ratingScore = RATING_SCORES[args.rating];
    await incrementDailyStats(ctx, identity.tokenIdentifier, "session", ratingScore);

    const nextIndex = session.currentIndex + 1;
    const isComplete = nextIndex >= session.cardOrder.length;

    if (isComplete) {
      const allResults = await ctx.db
        .query("cardResults")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
        .take(1000);
      const overallScore = computeOverallScore(allResults);

      await ctx.db.patch(args.sessionId, {
        currentIndex: nextIndex,
        status: "completed" as const,
        completedAt: Date.now(),
        overallScore,
      });
    } else {
      await ctx.db.patch(args.sessionId, { currentIndex: nextIndex });
    }

    return { isComplete, outcome: "recorded" as const };
  },
});

export const abandon = mutation({
  args: { sessionId: v.id("studySessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.tokenIdentifier) {
      return fail(notFound("Session not found"));
    }
    if (session.status !== "in_progress") {
      return { outcome: "alreadyClosed" as const };
    }
    await ctx.db.patch(args.sessionId, {
      status: "abandoned" as const,
      completedAt: Date.now(),
    });
    return { outcome: "abandoned" as const };
  },
});

export type StudySessionFailure = CommonFailure | StudySessionSetupFailure;
