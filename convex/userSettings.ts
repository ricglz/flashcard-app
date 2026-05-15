import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { SRS_DEFAULTS } from "./srs";
import { fail, ok, unauthenticated, type CommonFailure } from "./domain/result";
import { validateUserSettingsPatch, validateAiConfig, type SrsSettingsFailure } from "./domain/srsSettings";

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
    customChatPrompt: v.optional(v.string()),
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

    const finalProvider = patch.llmProvider ?? existing?.llmProvider;
    const finalKey = patch.llmApiKey ?? existing?.llmApiKey;
    const aiCheck = validateAiConfig(finalProvider, finalKey);
    if (!aiCheck.ok) return aiCheck;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay: patch.maxNewCardsPerDay ?? DEFAULTS.maxNewCardsPerDay,
        dayResetUtcHour: patch.dayResetUtcHour ?? DEFAULTS.dayResetUtcHour,
        ttsPlaybackSpeed: patch.ttsPlaybackSpeed ?? DEFAULTS.ttsPlaybackSpeed,
        ...(patch.dailyGoal !== undefined && { dailyGoal: patch.dailyGoal }),
        ...(patch.llmProvider !== undefined && { llmProvider: patch.llmProvider }),
        ...(patch.llmApiKey !== undefined && { llmApiKey: patch.llmApiKey }),
        ...(patch.customChatPrompt !== undefined && { customChatPrompt: patch.customChatPrompt }),
      });
    }
    return ok(null);
  },
});

export const getAiConfig = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!settings?.llmApiKey || !settings.llmProvider) return null;
    return {
      provider: settings.llmProvider,
      apiKey: settings.llmApiKey,
      customChatPrompt: settings.customChatPrompt,
    };
  },
});

export type UserSettingsFailure = CommonFailure | SrsSettingsFailure;
