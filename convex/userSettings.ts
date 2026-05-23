import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import * as Effect from "effect/Effect";
import { SRS_DEFAULTS } from "./srs";
import { type CommonFailure } from "./domain/result";
import { requireAuth, toDomainResultAsync } from "./domain/effect";
import {
  validateMaxNewCardsPerDayEffect,
  validateDayResetUtcHourEffect,
  validateTtsPlaybackSpeedEffect,
  validateDailyGoalEffect,
  type SrsSettingsFailure,
} from "./domain/srsSettings";

const DEFAULTS = {
  maxNewCardsPerDay: SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY,
  dayResetUtcHour: SRS_DEFAULTS.DAY_RESET_UTC_HOUR,
  ttsPlaybackSpeed: 0.75,
};

type UserSettingsPatch = Partial<
  Omit<Doc<"userSettings">, "_id" | "_creationTime" | "userId">
>;

async function getSettingsByUserId(
  ctx: QueryCtx | MutationCtx,
  userId: string,
) {
  return await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

async function patchOrInsertSettings(
  ctx: MutationCtx,
  userId: string,
  patch: UserSettingsPatch,
) {
  const existing = await getSettingsByUserId(ctx, userId);
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return;
  }

  await ctx.db.insert("userSettings", {
    userId,
    maxNewCardsPerDay: DEFAULTS.maxNewCardsPerDay,
    dayResetUtcHour: DEFAULTS.dayResetUtcHour,
    ttsPlaybackSpeed: DEFAULTS.ttsPlaybackSpeed,
    ...patch,
  });
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await getSettingsByUserId(ctx, identity.tokenIdentifier);
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
    const settings = await getSettingsByUserId(ctx, identity.tokenIdentifier);
    return { ttsPlaybackSpeed: settings?.ttsPlaybackSpeed ?? DEFAULTS.ttsPlaybackSpeed };
  },
});

export const hasLlmKey = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await getSettingsByUserId(ctx, identity.tokenIdentifier);
    return { hasLlmKey: !!settings?.llmApiKey };
  },
});

export const updateSrsSettings = mutation({
  args: {
    maxNewCardsPerDay: v.number(),
    dayResetUtcHour: v.number(),
    dailyGoal: v.number(),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const userId = identity.tokenIdentifier;
      const max = yield* validateMaxNewCardsPerDayEffect(args.maxNewCardsPerDay);
      const hour = yield* validateDayResetUtcHourEffect(args.dayResetUtcHour);
      const goal = yield* validateDailyGoalEffect(args.dailyGoal);

      const patch = {
        maxNewCardsPerDay: max,
        dayResetUtcHour: hour,
        dailyGoal: goal,
      };

      yield* Effect.promise(() => patchOrInsertSettings(ctx, userId, patch));
      return null;
    }),
  ),
});

export const updateAiConfig = mutation({
  args: {
    provider: v.string(),
    apiKey: v.string(),
    customChatPrompt: v.optional(v.string()),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const userId = identity.tokenIdentifier;

      const existing = yield* Effect.promise(() => getSettingsByUserId(ctx, userId));

      const effectiveKey = args.apiKey || existing?.llmApiKey;

      const patch = {
        llmProvider: args.provider || undefined,
        llmApiKey: effectiveKey ?? undefined,
        customChatPrompt: args.customChatPrompt,
      };

      yield* Effect.promise(() => patchOrInsertSettings(ctx, userId, patch));
      return null;
    }),
  ),
});

export const updateTtsPlaybackSpeed = mutation({
  args: {
    ttsPlaybackSpeed: v.number(),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const userId = identity.tokenIdentifier;
      const speed = yield* validateTtsPlaybackSpeedEffect(args.ttsPlaybackSpeed);

      yield* Effect.promise(() =>
        patchOrInsertSettings(ctx, userId, { ttsPlaybackSpeed: speed }),
      );
      return null;
    }),
  ),
});

export const getAiConfig = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await getSettingsByUserId(ctx, args.userId);
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
    const settings = await getSettingsByUserId(ctx, identity.tokenIdentifier);
    if (!settings?.llmApiKey || !settings.llmProvider) return null;
    return {
      provider: settings.llmProvider,
      apiKey: settings.llmApiKey,
      customChatPrompt: settings.customChatPrompt,
    };
  },
});
