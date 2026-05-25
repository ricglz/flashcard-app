"use node";

import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { fieldDefinitionValidator, sourceScopeValidator, weakContextMethodologyValidator } from "./schema";
import { renderRemedialPrompt } from "./lib/remedialPrompt";
import { renderFreeformPrompt } from "./lib/freeformPrompt";
import { igniteModel, loadModels, Message, type LlmCompletionOpts } from "multi-llm-ts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as ParseResult from "effect/ParseResult";
import * as Either from "effect/Either";
import { z } from "zod";
import { GeneratedSetPayloadSchema, type GeneratedSetPayload } from "../src/lib/aiToolingSchemas";
import { DEFAULT_MODELS } from "../src/lib/aiDefaults";
import type { CommonFailure, DomainResult } from "./domain/result";
import { requireAuth, toDomainResultAsync } from "./domain/effect";

const SYSTEM_GENERATION_PROMPT =
  "You are an expert flashcard author. Return only valid JSON. Prioritize realistic, cohesive, human-studyable cards over mechanically satisfying constraints.";

const INVALID_PAYLOAD_MESSAGE =
  "The model returned incomplete cards. Try fewer cards, clearer instructions, or a different model.";

const GENERATED_SET_STRUCTURE = z.object({
  name: z.string(),
  description: z.string().optional(),
  sourceSetIds: z.array(z.string()),
  sourceScope: z.enum(["single_set", "srs_enabled_sets", "custom"]),
  weakContextMethodology: z.string().optional(),
  fieldDefinitions: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      metadata: z.record(z.string(), z.unknown()),
      order: z.number(),
    }),
  ),
  cards: z.array(
    z.object({
      fields: z.record(z.string(), z.string()),
      sourceCardIds: z.array(z.string()).optional(),
      rationale: z.string().optional(),
    }),
  ),
  addToSrs: z.boolean(),
});

const GENERATION_COMPLETION_OPTS: LlmCompletionOpts = {
  temperature: 0.2,
  structuredOutput: {
    name: "generated_flashcard_set",
    structure: GENERATED_SET_STRUCTURE,
  },
};

const REPAIR_COMPLETION_OPTS: LlmCompletionOpts = {
  temperature: 0,
  structuredOutput: {
    name: "generated_flashcard_set",
    structure: GENERATED_SET_STRUCTURE,
  },
};

const generatedCardValidator = v.object({
  fields: v.record(v.string(), v.string()),
  sourceCardIds: v.optional(v.array(v.id("flashcards"))),
  rationale: v.optional(v.string()),
});

const generatedSetPayloadValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  sourceSetIds: v.array(v.id("flashcardSets")),
  sourceScope: sourceScopeValidator,
  weakContextMethodology: v.optional(weakContextMethodologyValidator),
  fieldDefinitions: v.array(fieldDefinitionValidator),
  cards: v.array(generatedCardValidator),
  addToSrs: v.boolean(),
});

type AiFailure =
  | CommonFailure
  | { readonly _tag: "LlmRateLimited"; readonly message: string; readonly retryAfterSeconds?: number }
  | { readonly _tag: "LlmInvalidPayload"; readonly message: string; readonly raw?: string; readonly issueCount?: number }
  | { readonly _tag: "LlmError"; readonly message: string };

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

function objectField(value: unknown, field: string): unknown {
  if (typeof value !== "object" || value === null || !(field in value)) return undefined;
  return (value as Record<string, unknown>)[field];
}

function errorTextForInspection(err: unknown): string {
  const parts = [
    err instanceof Error ? err.message : undefined,
    typeof err === "string" ? err : undefined,
  ];
  try {
    parts.push(JSON.stringify(err));
  } catch {
    // Ignore unserializable provider objects. The text is only used for classification.
  }
  return parts.filter(Boolean).join(" ");
}

function parseRetryAfterSeconds(text: string): number | undefined {
  const match = text.match(/try again in\s+([0-9.]+)\s*s/i);
  if (!match?.[1]) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds) : undefined;
}

function fallbackLlmMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  if (
    message.length > 200 ||
    message.includes("{") ||
    message.includes("}") ||
    /organization|billing|api[_ -]?key|token/i.test(message)
  ) {
    return fallback;
  }
  return message;
}

function llmFailure(err: unknown, fallback = "LLM request failed."): AiFailure {
  const text = errorTextForInspection(err);
  const status = objectField(err, "status") ?? objectField(err, "statusCode");
  const code = objectField(err, "code");
  const retryAfterSeconds = parseRetryAfterSeconds(text);

  if (
    status === 429 ||
    code === "rate_limit_exceeded" ||
    /rate[_ -]?limit/i.test(text)
  ) {
    return {
      _tag: "LlmRateLimited" as const,
      message: retryAfterSeconds === undefined
        ? "The AI provider is rate limited. Try again in a few seconds."
        : `The AI provider is rate limited. Try again in ${retryAfterSeconds} seconds.`,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    };
  }

  return {
    _tag: "LlmError" as const,
    message: fallbackLlmMessage(err, fallback),
  };
}

function cleanJsonContent(content: string): string {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function invalidPayloadFailure(raw: string | undefined, issueCount?: number): AiFailure {
  return {
    _tag: "LlmInvalidPayload" as const,
    message: INVALID_PAYLOAD_MESSAGE,
    ...(raw === undefined ? {} : { raw }),
    ...(issueCount === undefined ? {} : { issueCount }),
  };
}

function sanitizeInvalidPayloadFailure(issueCount?: number): AiFailure {
  return {
    _tag: "LlmInvalidPayload" as const,
    message: INVALID_PAYLOAD_MESSAGE,
    ...(issueCount === undefined ? {} : { issueCount }),
  };
}

function logAiFailure(
  event: string,
  details: {
    provider: string;
    model: string;
    failureTag: AiFailure["_tag"];
    retryAfterSeconds?: number;
    responseLength?: number;
    issueCount?: number;
  },
) {
  console.warn(`[ai] ${event}`, details);
}

function decodeGeneratedPayload(
  content: string,
  opts: { provider: string; model: string },
): Effect.Effect<GeneratedSetPayload, AiFailure> {
  const cleaned = cleanJsonContent(content);
  const parseResult = Schema.decodeUnknownEither(Schema.parseJson(GeneratedSetPayloadSchema))(cleaned);
  if (Either.isLeft(parseResult)) {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(parseResult.left);
    logAiFailure("LLM response was not valid JSON or had invalid payload", {
      provider: opts.provider,
      model: opts.model,
      failureTag: "LlmInvalidPayload",
      responseLength: content.length,
      issueCount: issues.length,
    });
    return Effect.fail(invalidPayloadFailure(content, issues.length));
  }
  return Effect.succeed(parseResult.right);
}

function renderRepairPrompt(opts: {
  originalPrompt: string;
  invalidOutput: string;
}): string {
  return `# Repair Invalid Flashcard JSON

The previous response was not valid JSON for the flashcard set schema. Return a corrected JSON object only.

## Requirements

- Return only valid JSON. Do not wrap it in Markdown fences.
- Preserve the intended generated set shape from the original request.
- Preserve realistic, cohesive, human-studyable card content.
- Do not add explanations outside JSON.

## Original Request

${opts.originalPrompt}

## Invalid Response To Repair

${opts.invalidOutput.slice(0, 30000)}
`;
}

function renderRefinementPrompt(opts: {
  draft: GeneratedSetPayload;
  instructions: string;
}): string {
  return `# Refine Generated Flashcards

Revise the current flashcard draft using the user's feedback. Return a replacement generated set payload as valid JSON only.

## User Feedback

${opts.instructions}

## Requirements

- Preserve \`fieldDefinitions\`, \`sourceSetIds\`, \`sourceScope\`, \`weakContextMethodology\`, and \`addToSrs\`.
- Keep cards realistic, cohesive, and human-studyable.
- Prefer natural examples over arbitrary combinations of terms.
- Do not create text that only exists to satisfy a schema requirement.
- Return only valid JSON. Do not wrap it in Markdown fences.

## Current Draft

${JSON.stringify(opts.draft, null, 2)}
`;
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
  const modelName = opts.model ?? DEFAULT_MODELS[opts.keyInfo.provider] ?? "gpt-4o";
  const requestAndValidate = (prompt: string, completionOpts: LlmCompletionOpts) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () => {
          const llm = igniteModel(opts.keyInfo.provider, modelName, { apiKey: opts.keyInfo.apiKey });
          const thread = [
            new Message("system", SYSTEM_GENERATION_PROMPT),
            new Message("user", prompt),
          ];
          return llm.complete(thread, completionOpts);
        },
        catch: (err) => {
          const failure = llmFailure(err);
          logAiFailure("LLM request failed", {
            provider: opts.keyInfo.provider,
            model: modelName,
            failureTag: failure._tag,
            ...("retryAfterSeconds" in failure && failure.retryAfterSeconds !== undefined
              ? { retryAfterSeconds: failure.retryAfterSeconds }
              : {}),
          });
          return failure;
        },
      });
      if (!response.content) {
        logAiFailure("LLM returned empty response", {
          provider: opts.keyInfo.provider,
          model: modelName,
          failureTag: "LlmInvalidPayload",
          responseLength: 0,
        });
        return yield* Effect.fail(invalidPayloadFailure(undefined));
      }
      const payload = yield* decodeGeneratedPayload(response.content, {
        provider: opts.keyInfo.provider,
        model: modelName,
      });
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

  return requestAndValidate(opts.prompt, GENERATION_COMPLETION_OPTS).pipe(
    Effect.catchTag("LlmInvalidPayload", (failure) =>
      requestAndValidate(
        renderRepairPrompt({
          originalPrompt: opts.prompt,
          invalidOutput: failure.raw ?? "",
        }),
        REPAIR_COMPLETION_OPTS,
      ).pipe(
        Effect.catchTag("LlmInvalidPayload", (repairFailure) =>
          Effect.fail(sanitizeInvalidPayloadFailure(repairFailure.issueCount)),
        ),
      ),
    ),
  );
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
    fieldDefinitions: v.array(fieldDefinitionValidator),
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
        fieldDefinitions: args.fieldDefinitions,
        targetCardCount: args.targetCardCount,
        name: args.name,
        addToSrs: args.addToSrs,
        instructions: args.instructions,
      });

      return yield* generateAndValidateJson(ctx, { prompt, model: args.model, keyInfo, userId });
    }),
  ),
});

export const refineGeneratedSet = action({
  args: {
    draft: generatedSetPayloadValidator,
    instructions: v.string(),
    model: v.optional(v.string()),
  },
  handler: (ctx, args): Promise<DomainResult<GenerateValue, AiFailure>> => toDomainResultAsync<GenerateValue, AiFailure>(
    Effect.gen(function* () {
      const instructions = args.instructions.trim();
      if (instructions.length === 0) {
        return yield* Effect.fail({
          _tag: "InvalidInput" as const,
          message: "Add refinement instructions before trying again.",
          field: "instructions",
        });
      }

      const { userId, keyInfo } = yield* resolveAuthAndConfig(ctx);
      const prompt = renderRefinementPrompt({
        draft: {
          ...args.draft,
          sourceSetIds: [...args.draft.sourceSetIds],
          fieldDefinitions: [...args.draft.fieldDefinitions],
          cards: args.draft.cards.map((card) => ({
            ...card,
            fields: { ...card.fields },
            sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
          })),
        },
        instructions,
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
    sourceScope: sourceScopeValidator,
    weakContextMethodology: v.optional(weakContextMethodologyValidator),
    fieldDefinitions: v.array(fieldDefinitionValidator),
    cards: v.array(generatedCardValidator),
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
    fieldDefinitions: v.array(fieldDefinitionValidator),
    cards: v.array(generatedCardValidator),
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
