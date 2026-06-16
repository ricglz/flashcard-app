import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";
import { internal } from "./_generated/api";

export const cleanupArchivedSetQueues = internalMutation({
  args: {
    setId: v.id("flashcardSets"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args): Promise<void> => {
    const srsPage = await ctx.db
      .query("srsCards")
      .withIndex("by_setId", (q) => q.eq("setId", args.setId))
      .paginate({ cursor: args.cursor, numItems: 50 });

    for (const sc of srsPage.page) {
      await deleteAllMatching(ctx, () =>
        ctx.db
          .query("reviewQueue")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", sc._id))
          .take(DELETION_BATCH_SIZE)
      );
    }

    if (!srsPage.isDone) {
      await ctx.scheduler.runAfter(0, internal.internalCleanup.cleanupArchivedSetQueues, {
        setId: args.setId,
        cursor: srsPage.continueCursor,
      });
    }
  },
});
