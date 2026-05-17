import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import * as Effect from "effect/Effect";
import { SRS_DEFAULTS } from "./srs";
import { fail, ok, unauthenticated, type CommonFailure } from "./domain/result";
import { requireAuth, toDomainResultAsync } from "./domain/effect";
import {
  validateMaxNewCardsPerDay,
  validateMaxNewCardsPerDayEffect,
  validateDayResetUtcHour,
  validateDayResetUtcHourEffect,
  validateTtsPlaybackSpeed,
  validateDailyGoal,
  validateDailyGoalEffect,
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
    const validated = await toDomainResultAsync(
      Effect.gen(function* () {
        const identity = yield* requireAuth(ctx);
        const max = yield* validateMaxNewCardsPerDayEffect(args.maxNewCardsPerDay);
        const hour = yield* validateDayResetUtcHourEffect(args.dayResetUtcHour);
        const goal = yield* validateDailyGoalEffect(args.dailyGoal);
        return { userId: identity.tokenIdentifier, max, hour, goal };
      }),
    );
    if (!validated.ok) return validated;
    const { userId, max, hour, goal } = validated.value;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const patch = {
      maxNewCardsPerDay: max,
      dayResetUtcHour: hour,
      dailyGoal: goal,
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

export const getAiConfigForServer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    if (!settings?.llmApiKey || !settings.llmProvider) return null;
    return {
      provider: settings.llmProvider,
      apiKey: settings.llmApiKey,
      customChatPrompt: settings.customChatPrompt,
    };
  },
});
