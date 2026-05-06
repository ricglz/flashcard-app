import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { SRS_DEFAULTS } from "./srs";

const DEFAULTS = {
  maxNewCardsPerDay: SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY,
  dayResetUtcHour: SRS_DEFAULTS.DAY_RESET_UTC_HOUR,
  ttsPlaybackSpeed: 0.75,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    return {
      ...DEFAULTS,
      ...settings,
    };
  },
});

export const update = mutation({
  args: {
    maxNewCardsPerDay: v.optional(v.number()),
    dayResetUtcHour: v.optional(v.number()),
    ttsPlaybackSpeed: v.optional(v.number()),
    dailyGoal: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;

    const patch: Record<string, number | undefined> = {};
    if (args.maxNewCardsPerDay !== undefined)
      patch.maxNewCardsPerDay = args.maxNewCardsPerDay;
    if (args.dayResetUtcHour !== undefined) {
      const h = Math.round(args.dayResetUtcHour);
      if (h < 0 || h > 23) throw new Error("Hour must be 0-23");
      patch.dayResetUtcHour = h;
    }
    if (args.ttsPlaybackSpeed !== undefined) {
      const s = Math.round(args.ttsPlaybackSpeed * 100) / 100;
      if (s < 0.25 || s > 2.0) throw new Error("Speed must be 0.25-2.0");
      patch.ttsPlaybackSpeed = s;
    }
    if (args.dailyGoal !== undefined) {
      if (args.dailyGoal < 0 || args.dailyGoal > 500)
        throw new Error("Daily goal must be 0-500");
      patch.dailyGoal = args.dailyGoal === 0 ? undefined : args.dailyGoal;
    }

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay:
          (patch.maxNewCardsPerDay as number) ?? DEFAULTS.maxNewCardsPerDay,
        dayResetUtcHour: (patch.dayResetUtcHour as number) ?? DEFAULTS.dayResetUtcHour,
        ttsPlaybackSpeed:
          (patch.ttsPlaybackSpeed as number) ?? DEFAULTS.ttsPlaybackSpeed,
        ...(patch.dailyGoal !== undefined && { dailyGoal: patch.dailyGoal as number }),
      });
    }
  },
});
