"use node";

import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { weakContextMethodologyValidator } from "./schema";
import { renderRemedialPrompt } from "./lib/remedialPrompt";
import { renderFreeformPrompt } from "./lib/freeformPrompt";
import { igniteModel, loadModels, Message } from "multi-llm-ts";
import { Schema, ParseResult } from "effect";
import { GeneratedSetPayloadSchema, type GeneratedSetPayload } from "../src/lib/aiToolingSchemas";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  xai: "grok-3",
  ollama: "llama3",
};

type GenerateResult =
  | { ok: false; error: string; raw?: string }
  | { ok: true; validation: { ok: boolean; issues: string[] }; payload: GeneratedSetPayload };

type AuthAndConfig = {
  userId: string;
  keyInfo: { provider: string; apiKey: string; customChatPrompt?: string };
};

async function resolveAuthAndConfig(
  ctx: ActionCtx,
): Promise<{ ok: true } & AuthAndConfig | { ok: false; error: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { ok: false, error: "Please sign in to continue." };
  const userId = identity.tokenIdentifier;
  const keyInfo = await ctx.runQuery(internal.userSettings.getAiConfig, { userId });
  if (!keyInfo) return { ok: false, error: "No API key configured. Add one in Settings." };
  return { ok: true, userId, keyInfo };
}

async function generateAndValidateJson(
  ctx: ActionCtx,
  opts: { prompt: string; model: string | undefined; keyInfo: AuthAndConfig["keyInfo"]; userId: string },
): Promise<GenerateResult> {
  const modelName = opts.model || DEFAULT_MODELS[opts.keyInfo.provider] || "gpt-4o";
  const llm = igniteModel(opts.keyInfo.provider, modelName, { apiKey: opts.keyInfo.apiKey });
  const thread = [
    new Message("system", "You are a flashcard generation assistant. Return only valid JSON."),
    new Message("user", opts.prompt),
  ];
  const response = await llm.complete(thread);
  if (!response.content) {
    return { ok: false, error: "LLM returned empty response." };
  }
  let parsed: unknown;
  try {
    const cleaned = response.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "LLM response was not valid JSON.", raw: response.content };
  }
  const decoded = Schema.decodeUnknownEither(GeneratedSetPayloadSchema)(parsed);
  if (decoded._tag === "Left") {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(decoded.left);
    const message = issues.map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: `LLM returned invalid payload: ${message}`, raw: response.content };
  }
  const payload = decoded.right;
  const validation: { ok: boolean; issues: string[] } = await ctx.runQuery(
    internal.tooling.validateGeneratedSetForTool,
    {
      ...payload,
      sourceSetIds: [...payload.sourceSetIds] as Id<"flashcardSets">[],
      fieldDefinitions: [...payload.fieldDefinitions],
      cards: payload.cards.map(c => ({
        ...c,
        fields: { ...c.fields },
        sourceCardIds: c.sourceCardIds ? [...c.sourceCardIds] as Id<"flashcards">[] : undefined,
      })),
      userId: opts.userId,
    },
  );
  return { ok: true, validation, payload };
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
  handler: async (ctx, args): Promise<GenerateResult> => {
    const auth = await resolveAuthAndConfig(ctx);
    if (!auth.ok) return auth;
    const { userId, keyInfo } = auth;

    const scope = args.setId
      ? { kind: "set" as const, setId: args.setId }
      : { kind: "srs_enabled_sets" as const };

    const weakCards = await ctx.runQuery(internal.tooling.getWeakCardsForTool, {
      userId,
      scope,
      methodology: args.methodology,
      include: { recentRatings: true },
    });

    if (weakCards.schemaGroups.length === 0) {
      return { ok: false, error: "No weak cards found. Study more cards first." };
    }

    const prompt = renderRemedialPrompt({
      context: weakCards,
      targetCardCount: args.targetCardCount ?? 20,
      name: args.name,
      addToSrs: args.addToSrs,
      instructions: args.instructions,
    });

    return generateAndValidateJson(ctx, { prompt, model: args.model, keyInfo, userId });
  },
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
  handler: async (ctx, args): Promise<GenerateResult> => {
    const auth = await resolveAuthAndConfig(ctx);
    if (!auth.ok) return auth;
    const { userId, keyInfo } = auth;

    const prompt = renderFreeformPrompt({
      prompt: args.prompt,
      fieldDefinitions: args.fieldDefinitions as Parameters<typeof renderFreeformPrompt>[0]["fieldDefinitions"],
      targetCardCount: args.targetCardCount,
      name: args.name,
      addToSrs: args.addToSrs,
      instructions: args.instructions,
    });

    return generateAndValidateJson(ctx, { prompt, model: args.model, keyInfo, userId });
  },
});

type ConfirmResult =
  | { ok: false; error: string }
  | { ok: true; setId: string; cardCount: number; srsEnabled: boolean };

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
  handler: async (ctx, args): Promise<ConfirmResult> => {
    const auth = await resolveAuthAndConfig(ctx);
    if (!auth.ok) return auth;

    const result = await ctx.runMutation(internal.tooling.createGeneratedSetForTool, {
      name: args.name,
      description: args.description,
      sourceSetIds: args.sourceSetIds,
      sourceScope: args.sourceScope,
      weakContextMethodology: args.weakContextMethodology,
      fieldDefinitions: args.fieldDefinitions,
      cards: args.cards,
      addToSrs: args.addToSrs,
      userId: auth.userId,
    });

    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, setId: result.value.setId as string, cardCount: result.value.cardCount, srsEnabled: result.value.srsEnabled };
  },
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
  handler: async (ctx, args): Promise<ConfirmResult> => {
    const auth = await resolveAuthAndConfig(ctx);
    if (!auth.ok) return auth;

    const result = await ctx.runMutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: auth.userId,
      targetSetId: args.targetSetId,
      fieldDefinitions: args.fieldDefinitions,
      cards: args.cards,
    });

    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, setId: result.value.setId as string, cardCount: result.value.cardCount, srsEnabled: result.value.srsEnabled };
  },
});

type ChatResult = { ok: false; error: string } | { ok: true; content: string };

export const sendChatMessage = action({
  args: {
    message: v.string(),
    history: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
    model: v.optional(v.string()),
    context: v.optional(v.object({
      setId: v.optional(v.id("flashcardSets")),
      cardFields: v.optional(v.record(v.string(), v.string())),
    })),
  },
  handler: async (ctx, args): Promise<ChatResult> => {
    const auth = await resolveAuthAndConfig(ctx);
    if (!auth.ok) return auth;
    const { userId, keyInfo } = auth;

    let systemPrompt = keyInfo.customChatPrompt || "You are a study assistant for a flashcard app. Help the user understand their study material. Be concise and helpful.";

    if (args.context?.setId) {
      const setList = await ctx.runQuery(internal.tooling.listSetsForTool, {
        userId,
        include: { fieldDefinitions: true },
      });
      const matchedSet = setList.sets.find((s) => s.setId === args.context?.setId);
      if (matchedSet) {
        const fieldNames = matchedSet.fieldDefinitions?.map((f) => f.name).join(", ");
        systemPrompt += `\n\nThe user is studying the set "${matchedSet.name}" with fields: ${fieldNames}.`;
      }
    }

    if (args.context?.cardFields) {
      const entries = Object.entries(args.context.cardFields)
        .map(([field, value]) => `- ${field}: ${value}`)
        .join("\n");
      systemPrompt += `\n\nThey are currently looking at this card:\n${entries}`;
    }

    const modelName = args.model || DEFAULT_MODELS[keyInfo.provider] || "gpt-4o";
    const llm = igniteModel(keyInfo.provider, modelName, { apiKey: keyInfo.apiKey });

    const thread = [
      new Message("system", systemPrompt),
      ...args.history.map((m) => new Message(m.role, m.content)),
      new Message("user", args.message),
    ];

    const response = await llm.complete(thread);
    return { ok: true, content: response.content ?? "" };
  },
});

type AvailableModelsResult =
  | { ok: false; error: string }
  | { ok: true; models: { id: string; name: string }[] };

export const getAvailableModels = action({
  args: {},
  handler: async (ctx): Promise<AvailableModelsResult> => {
    const auth = await resolveAuthAndConfig(ctx);
    if (!auth.ok) return auth;
    try {
      const result = await loadModels(auth.keyInfo.provider, { apiKey: auth.keyInfo.apiKey });
      if (!result) return { ok: true, models: [] };
      return {
        ok: true,
        models: result.chat.map((m) => ({ id: m.id, name: m.name })),
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to load models" };
    }
  },
});
