import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { SRS_DEFAULTS } from "./srs";
import { fail, ok, unauthenticated, type CommonFailure } from "./domain/result";
import {
  validateMaxNewCardsPerDay,
  validateDayResetUtcHour,
  validateTtsPlaybackSpeed,
  validateDailyGoal,
  type SrsSettingsFailure,
} from "./domain/srsSettings";

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
    const key = settings?.llmApiKey;
    return {
      ...DEFAULTS,
      ...safe,
      hasLlmKey: !!key,
      llmKeyHint: key ? `${"•".repeat(Math.min(key.length - 4, 20))}${key.slice(-4)}` : null,
    };
  },
});

export const getTtsConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    return { ttsPlaybackSpeed: settings?.ttsPlaybackSpeed ?? DEFAULTS.ttsPlaybackSpeed };
  },
});

export const hasLlmKey = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    return { hasLlmKey: !!settings?.llmApiKey };
  },
});

export const updateSrsSettings = mutation({
  args: {
    maxNewCardsPerDay: v.number(),
    dayResetUtcHour: v.number(),
    dailyGoal: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const maxResult = validateMaxNewCardsPerDay(args.maxNewCardsPerDay);
    if (!maxResult.ok) return maxResult;
    const hourResult = validateDayResetUtcHour(args.dayResetUtcHour);
    if (!hourResult.ok) return hourResult;
    const goalResult = validateDailyGoal(args.dailyGoal);
    if (!goalResult.ok) return goalResult;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const patch = {
      maxNewCardsPerDay: maxResult.value,
      dayResetUtcHour: hourResult.value,
      dailyGoal: goalResult.value,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        ...patch,
        ttsPlaybackSpeed: DEFAULTS.ttsPlaybackSpeed,
      });
    }
    return ok(null);
  },
});

export const updateAiConfig = mutation({
  args: {
    provider: v.string(),
    apiKey: v.string(),
    customChatPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const effectiveKey = args.apiKey || existing?.llmApiKey;

    const patch = {
      llmProvider: args.provider || undefined,
      llmApiKey: effectiveKey ?? undefined,
      customChatPrompt: args.customChatPrompt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay: DEFAULTS.maxNewCardsPerDay,
        dayResetUtcHour: DEFAULTS.dayResetUtcHour,
        ttsPlaybackSpeed: DEFAULTS.ttsPlaybackSpeed,
        ...patch,
      });
    }
    return ok(null);
  },
});

export const updateTtsPlaybackSpeed = mutation({
  args: {
    ttsPlaybackSpeed: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const speedResult = validateTtsPlaybackSpeed(args.ttsPlaybackSpeed);
    if (!speedResult.ok) return speedResult;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ttsPlaybackSpeed: speedResult.value });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay: DEFAULTS.maxNewCardsPerDay,
        dayResetUtcHour: DEFAULTS.dayResetUtcHour,
        ttsPlaybackSpeed: speedResult.value,
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
