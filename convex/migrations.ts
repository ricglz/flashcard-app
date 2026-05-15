import { internalMutation } from "./_generated/server";

export const backfillVisibility = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("flashcardSets").take(500);
    for (const set of sets) {
      if (set.visibility === undefined) {
        await ctx.db.patch(set._id, { visibility: "private" });
      }
    }
  },
});

export const backfillOrigin = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("flashcardSets").take(500);
    for (const set of sets) {
      if (set.origin === undefined) {
        await ctx.db.patch(set._id, { origin: { kind: "manual" } });
      }
    }
  },
});

export const backfillTtsOnlyFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("studySessions").take(500);
    for (const session of sessions) {
      if (session.ttsOnlyFields === undefined) {
        await ctx.db.patch(session._id, { ttsOnlyFields: [] });
      }
    }
  },
});

export const backfillDefaultTtsOnlyFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userSets = await ctx.db.query("userSets").take(500);
    for (const us of userSets) {
      if (us.defaultTtsOnlyFields === undefined) {
        await ctx.db.patch(us._id, { defaultTtsOnlyFields: [] });
      }
    }
  },
});
