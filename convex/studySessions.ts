import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const RATING_SCORES: Record<string, number> = {
  wrong: 0,
  hard: 1,
  good: 2,
  easy: 3,
};

/** Compute overall score from an array of card result ratings. */
export function computeOverallScore(
  ratings: Array<{ rating: string }>
): number {
  if (ratings.length === 0) return 0;
  const totalScore = ratings.reduce(
    (sum, r) => sum + (RATING_SCORES[r.rating] ?? 0),
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
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_setId_and_userId", (q) =>
        q.eq("setId", args.setId).eq("userId", identity.tokenIdentifier)
      )
      .take(50);
    return sessions.find((s) => s.status === "in_progress") ?? null;
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
    shuffle: v.boolean(),
    cardLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const set = await ctx.db.get(args.setId);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");

    // Validate front/back fields
    if (args.frontFields.length === 0)
      throw new Error("frontFields must not be empty");
    if (args.backFields.length === 0)
      throw new Error("backFields must not be empty");

    const validFieldNames = new Set(
      (set.fieldDefinitions as Array<{ name: string }>).map((fd) => fd.name)
    );
    for (const f of args.frontFields) {
      if (!validFieldNames.has(f))
        throw new Error(`Invalid front field: ${f}`);
    }
    for (const f of args.backFields) {
      if (!validFieldNames.has(f))
        throw new Error(`Invalid back field: ${f}`);
    }

    // Get all cards for this set
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.setId))
      .take(1000);

    if (cards.length === 0) throw new Error("No cards in this set");

    // Build card order
    let cardOrder = cards
      .sort((a, b) => a.order - b.order)
      .map((c) => c._id);

    if (args.shuffle) {
      // Fisher-Yates shuffle
      for (let i = cardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
      }
    }

    // Limit number of cards if specified
    if (
      args.cardLimit &&
      args.cardLimit > 0 &&
      args.cardLimit < cardOrder.length
    ) {
      cardOrder = cardOrder.slice(0, args.cardLimit);
    }

    return await ctx.db.insert("studySessions", {
      setId: args.setId,
      userId: identity.tokenIdentifier,
      frontFields: args.frontFields,
      backFields: args.backFields,
      cardOrder,
      currentIndex: 0,
      status: "in_progress",
      startedAt: Date.now(),
    });
  },
});

export const recordResult = mutation({
  args: {
    sessionId: v.id("studySessions"),
    cardId: v.id("flashcards"),
    rating: v.union(
      v.literal("wrong"),
      v.literal("hard"),
      v.literal("good"),
      v.literal("easy")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.tokenIdentifier)
      throw new Error("Not found");
    if (session.status !== "in_progress")
      throw new Error("Session is not active");

    const expectedCardId = session.cardOrder[session.currentIndex];
    if (args.cardId !== expectedCardId)
      throw new Error("cardId does not match the current card in the session");

    await ctx.db.insert("cardResults", {
      sessionId: args.sessionId,
      cardId: args.cardId,
      rating: args.rating,
      timestamp: Date.now(),
    });

    // Advance the session
    const nextIndex = session.currentIndex + 1;
    const isComplete = nextIndex >= session.cardOrder.length;

    if (isComplete) {
      // Compute overall score
      const allResults = await ctx.db
        .query("cardResults")
        .withIndex("by_sessionId", (q) =>
          q.eq("sessionId", args.sessionId)
        )
        .take(1000);
      const overallScore = computeOverallScore(allResults);

      await ctx.db.patch(args.sessionId, {
        currentIndex: nextIndex,
        status: "completed" as const,
        completedAt: Date.now(),
        overallScore,
      });
    } else {
      await ctx.db.patch(args.sessionId, {
        currentIndex: nextIndex,
      });
    }

    return { isComplete };
  },
});

export const abandon = mutation({
  args: { sessionId: v.id("studySessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.tokenIdentifier)
      throw new Error("Not found");
    if (session.status !== "in_progress")
      throw new Error("Session is not active");
    await ctx.db.patch(args.sessionId, {
      status: "abandoned" as const,
      completedAt: Date.now(),
    });
  },
});
