import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
