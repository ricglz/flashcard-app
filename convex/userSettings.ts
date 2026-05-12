import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { SRS_DEFAULTS } from "./srs";
import { fail, ok, unauthenticated, type CommonFailure } from "./domain/result";
import { validateUserSettingsPatch, type SrsSettingsFailure } from "./domain/srsSettings";

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
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const patchResult = validateUserSettingsPatch(args);
    if (!patchResult.ok) return patchResult;
    const patch = patchResult.value;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay: patch.maxNewCardsPerDay ?? DEFAULTS.maxNewCardsPerDay,
        dayResetUtcHour: patch.dayResetUtcHour ?? DEFAULTS.dayResetUtcHour,
        ttsPlaybackSpeed: patch.ttsPlaybackSpeed ?? DEFAULTS.ttsPlaybackSpeed,
        ...(patch.dailyGoal !== undefined && { dailyGoal: patch.dailyGoal }),
      });
    }
    return ok(null);
  },
});

export type UserSettingsFailure = CommonFailure | SrsSettingsFailure;
