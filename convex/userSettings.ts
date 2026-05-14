import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
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
    const { llmApiKey: _stripped, ...safe } = settings ?? {};
    return {
      ...DEFAULTS,
      ...safe,
      hasLlmKey: !!settings?.llmApiKey,
    };
  },
});

export const update = mutation({
  args: {
    maxNewCardsPerDay: v.optional(v.number()),
    dayResetUtcHour: v.optional(v.number()),
    ttsPlaybackSpeed: v.optional(v.number()),
    dailyGoal: v.optional(v.number()),
    llmProvider: v.optional(v.string()),
    llmApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const { llmProvider, llmApiKey, ...srsArgs } = args;

    const patchResult = validateUserSettingsPatch(srsArgs);
    if (!patchResult.ok) return patchResult;
    const patch: Record<string, unknown> = { ...patchResult.value };

    if (llmProvider !== undefined) patch.llmProvider = llmProvider;
    if (llmApiKey !== undefined) patch.llmApiKey = llmApiKey;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay: (patch.maxNewCardsPerDay as number) ?? DEFAULTS.maxNewCardsPerDay,
        dayResetUtcHour: (patch.dayResetUtcHour as number) ?? DEFAULTS.dayResetUtcHour,
        ttsPlaybackSpeed: (patch.ttsPlaybackSpeed as number) ?? DEFAULTS.ttsPlaybackSpeed,
        ...(patch.dailyGoal !== undefined && { dailyGoal: patch.dailyGoal as number }),
        ...(llmProvider !== undefined && { llmProvider }),
        ...(llmApiKey !== undefined && { llmApiKey }),
      });
    }
    return ok(null);
  },
});

export const getApiKey = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!settings?.llmApiKey || !settings?.llmProvider) return null;
    return { provider: settings.llmProvider, apiKey: settings.llmApiKey };
  },
});

export type UserSettingsFailure = CommonFailure | SrsSettingsFailure;
