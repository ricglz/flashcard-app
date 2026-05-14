import { internalMutation } from "./_generated/server";

export const backfillCardCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("flashcardSets").take(500);
    for (const set of sets) {
      const cards = await ctx.db
        .query("flashcards")
        .withIndex("by_setId", (q) => q.eq("setId", set._id))
        .take(1000);
      await ctx.db.patch(set._id, { cardCount: cards.length });
    }
  },
});
