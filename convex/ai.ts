"use node";

import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { weakContextMethodologyValidator } from "./schema";
import { renderRemedialPrompt } from "./lib/remedialPrompt";
import { renderFreeformPrompt } from "./lib/freeformPrompt";
import { igniteModel, loadModels, Message } from "multi-llm-ts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as ParseResult from "effect/ParseResult";
import * as Either from "effect/Either";
import { GeneratedSetPayloadSchema, type GeneratedSetPayload } from "../src/lib/aiToolingSchemas";
import { DEFAULT_MODELS } from "../src/lib/aiDefaults";
import type { CommonFailure, DomainResult } from "./domain/result";
import { requireAuth, toDomainResultAsync } from "./domain/effect";

type AiFailure =
  | CommonFailure
  | { readonly _tag: "LlmError"; readonly message: string; readonly raw?: string };

type AuthAndConfig = {
  userId: string;
  keyInfo: { provider: string; apiKey: string; customChatPrompt?: string };
};

type GenerateValue = {
  validation: { ok: boolean; issues: string[] };
  payload: GeneratedSetPayload;
};

type ConfirmValue = {
  setId: string;
  cardCount: number;
  srsEnabled: boolean;
};

function llmFailure(err: unknown, fallback = "LLM request failed."): AiFailure {
  return {
    _tag: "LlmError" as const,
    message: err instanceof Error ? err.message : fallback,
  };
}

function resolveAuthAndConfig(
  ctx: ActionCtx,
): Effect.Effect<AuthAndConfig, AiFailure> {
  return Effect.gen(function* () {
    const identity = yield* requireAuth(ctx);
    const keyInfo: AuthAndConfig["keyInfo"] | null =
      yield* Effect.promise(() =>
        ctx.runQuery(internal.userSettings.getAiConfig, { userId: identity.tokenIdentifier }),
      );
    if (!keyInfo) {
      return yield* Effect.fail({
        _tag: "NotFound" as const,
        message: "No API key configured. Add one in Settings.",
      });
    }
    return { userId: identity.tokenIdentifier, keyInfo };
  });
}

function generateAndValidateJson(
  ctx: ActionCtx,
  opts: { prompt: string; model: string | undefined; keyInfo: AuthAndConfig["keyInfo"]; userId: string },
): Effect.Effect<GenerateValue, AiFailure> {
  return Effect.gen(function* () {
    const modelName = opts.model ?? DEFAULT_MODELS[opts.keyInfo.provider] ?? "gpt-4o";
    const response = yield* Effect.tryPromise({
      try: () => {
        const llm = igniteModel(opts.keyInfo.provider, modelName, { apiKey: opts.keyInfo.apiKey });
        const thread = [
          new Message("system", "You are a flashcard generation assistant. Return only valid JSON."),
          new Message("user", opts.prompt),
        ];
        return llm.complete(thread);
      },
      catch: llmFailure,
    });
    if (!response.content) {
      console.warn("[ai] LLM returned empty response", { model: modelName });
      return yield* Effect.fail({
        _tag: "LlmError" as const,
        message: "LLM returned empty response.",
      });
    }
    const cleaned = response.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parseResult = Schema.decodeUnknownEither(Schema.parseJson(GeneratedSetPayloadSchema))(cleaned);
    if (Either.isLeft(parseResult)) {
      const issues = ParseResult.ArrayFormatter.formatErrorSync(parseResult.left);
      const message = issues.map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`).join("; ");
      console.warn("[ai] LLM response was not valid JSON or had invalid payload", { model: modelName, issues: message });
      return yield* Effect.fail({
        _tag: "LlmError" as const,
        message: `LLM returned invalid payload: ${message}`,
        raw: response.content,
      });
    }
    const payload = parseResult.right;
    const validation: { ok: boolean; issues: string[] } =
      yield* Effect.promise(() =>
        ctx.runQuery(
          internal.tooling.validateGeneratedSetForTool,
          {
            ...payload,
            sourceSetIds: [...payload.sourceSetIds],
            fieldDefinitions: [...payload.fieldDefinitions],
            cards: payload.cards.map(c => ({
              ...c,
              fields: { ...c.fields },
              sourceCardIds: c.sourceCardIds ? [...c.sourceCardIds] : undefined,
            })),
            userId: opts.userId,
          },
        ),
      );
    return { validation, payload };
  });
}

export const generateRemedialCards = action({
  args: {
    methodology: v.optional(weakContextMethodologyValidator),
    setId: v.optional(v.id("flashcardSets")),
    targetCardCount: v.optional(v.number()),
    name: v.string(),
    model: v.optional(v.string()),
    addToSrs: v.boolean(),
    instructions: v.optional(v.string()),
  },
  handler: (ctx, args): Promise<DomainResult<GenerateValue, AiFailure>> => toDomainResultAsync<GenerateValue, AiFailure>(
    Effect.gen(function* () {
      const { userId, keyInfo } = yield* resolveAuthAndConfig(ctx);

      const scope = args.setId
        ? { kind: "set" as const, setId: args.setId }
        : { kind: "srs_enabled_sets" as const };

      const weakCards = yield* Effect.promise(() =>
          ctx.runQuery(internal.tooling.getWeakCardsForTool, {
            userId,
            scope,
            methodology: args.methodology,
            include: { recentRatings: true },
          }),
        );

      if (weakCards.schemaGroups.length === 0) {
        return yield* Effect.fail({
          _tag: "NotFound" as const,
          message: "No weak cards found. Study more cards first.",
        });
      }

      const prompt = renderRemedialPrompt({
        context: weakCards,
        targetCardCount: args.targetCardCount ?? 20,
        name: args.name,
        addToSrs: args.addToSrs,
        instructions: args.instructions,
      });

      return yield* generateAndValidateJson(ctx, { prompt, model: args.model, keyInfo, userId });
    }),
  ),
});

export const generateFromPrompt = action({
  args: {
    prompt: v.string(),
    fieldDefinitions: v.array(v.object({
      name: v.string(),
      role: v.union(v.literal("primary"), v.literal("pronunciation"), v.literal("definition"), v.literal("note")),
      metadata: v.record(v.string(), v.any()),
      order: v.number(),
    })),
    targetCardCount: v.number(),
    name: v.string(),
    model: v.optional(v.string()),
    addToSrs: v.boolean(),
    instructions: v.optional(v.string()),
  },
  handler: (ctx, args): Promise<DomainResult<GenerateValue, AiFailure>> => toDomainResultAsync<GenerateValue, AiFailure>(
    Effect.gen(function* () {
      const { userId, keyInfo } = yield* resolveAuthAndConfig(ctx);

      const prompt = renderFreeformPrompt({
        prompt: args.prompt,
        fieldDefinitions: args.fieldDefinitions as Parameters<typeof renderFreeformPrompt>[0]["fieldDefinitions"],
        targetCardCount: args.targetCardCount,
        name: args.name,
        addToSrs: args.addToSrs,
        instructions: args.instructions,
      });

      return yield* generateAndValidateJson(ctx, { prompt, model: args.model, keyInfo, userId });
    }),
  ),
});

export const confirmGeneratedSet = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sourceSetIds: v.array(v.id("flashcardSets")),
    sourceScope: v.union(
      v.literal("single_set"),
      v.literal("srs_enabled_sets"),
      v.literal("custom")
    ),
    weakContextMethodology: v.optional(weakContextMethodologyValidator),
    fieldDefinitions: v.array(v.object({
      name: v.string(),
      role: v.union(v.literal("primary"), v.literal("pronunciation"), v.literal("definition"), v.literal("note")),
      metadata: v.record(v.string(), v.any()),
      order: v.number(),
    })),
    cards: v.array(v.object({
      fields: v.record(v.string(), v.string()),
      sourceCardIds: v.optional(v.array(v.id("flashcards"))),
      rationale: v.optional(v.string()),
    })),
    addToSrs: v.boolean(),
  },
  handler: (ctx, args): Promise<DomainResult<ConfirmValue, AiFailure>> => toDomainResultAsync<ConfirmValue, AiFailure>(
    Effect.gen(function* () {
      const { userId } = yield* resolveAuthAndConfig(ctx);

      const result = yield* Effect.promise(() =>
          ctx.runMutation(internal.tooling.createGeneratedSetForTool, {
            name: args.name,
            description: args.description,
            sourceSetIds: args.sourceSetIds,
            sourceScope: args.sourceScope,
            weakContextMethodology: args.weakContextMethodology,
            fieldDefinitions: args.fieldDefinitions,
            cards: args.cards,
            addToSrs: args.addToSrs,
            userId,
          }),
        );

      if (!result.ok) {
        return yield* Effect.fail(result.error);
      }
      return { setId: String(result.value.setId), cardCount: result.value.cardCount, srsEnabled: result.value.srsEnabled };
    }),
  ),
});

export const confirmAppendCards = action({
  args: {
    targetSetId: v.id("flashcardSets"),
    fieldDefinitions: v.array(v.object({
      name: v.string(),
      role: v.union(v.literal("primary"), v.literal("pronunciation"), v.literal("definition"), v.literal("note")),
      metadata: v.record(v.string(), v.any()),
      order: v.number(),
    })),
    cards: v.array(v.object({
      fields: v.record(v.string(), v.string()),
      sourceCardIds: v.optional(v.array(v.id("flashcards"))),
      rationale: v.optional(v.string()),
    })),
  },
  handler: (ctx, args): Promise<DomainResult<ConfirmValue, AiFailure>> => toDomainResultAsync<ConfirmValue, AiFailure>(
    Effect.gen(function* () {
      const { userId } = yield* resolveAuthAndConfig(ctx);

      const result = yield* Effect.promise(() =>
          ctx.runMutation(internal.tooling.appendGeneratedCardsForTool, {
            userId,
            targetSetId: args.targetSetId,
            fieldDefinitions: args.fieldDefinitions,
            cards: args.cards,
          }),
        );

      if (!result.ok) {
        return yield* Effect.fail(result.error);
      }
      return { setId: String(result.value.setId), cardCount: result.value.cardCount, srsEnabled: result.value.srsEnabled };
    }),
  ),
});

export const getAvailableModels = action({
  args: {},
  handler: (ctx): Promise<DomainResult<{ models: { id: string; name: string }[] }, AiFailure>> => toDomainResultAsync<{ models: { id: string; name: string }[] }, AiFailure>(
    Effect.gen(function* () {
      const { keyInfo } = yield* resolveAuthAndConfig(ctx);
      const result = yield* Effect.tryPromise({
        try: () => loadModels(keyInfo.provider, { apiKey: keyInfo.apiKey }),
        catch: (err) => llmFailure(err, "Failed to load models"),
      });
      return { models: result ? result.chat.map((m) => ({ id: m.id, name: m.name })) : [] };
    }),
  ),
});

export type { AiFailure };
