"use node";

import { v } from "convex/values";
import type { FunctionArgs } from "convex/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { weakContextMethodologyValidator } from "./schema";
import { renderRemedialPrompt } from "./lib/remedialPrompt";
import { igniteModel, Message } from "multi-llm-ts";
import type { CommonFailure } from "./domain/result";

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
  | { ok: true; validation: { ok: boolean; issues: string[] }; payload: Record<string, unknown> };

export const generateRemedialCards = action({
  args: {
    methodology: v.optional(weakContextMethodologyValidator),
    setId: v.optional(v.id("flashcardSets")),
    targetCardCount: v.optional(v.number()),
    name: v.string(),
    model: v.optional(v.string()),
    addToSrs: v.boolean(),
  },
  handler: async (ctx, args): Promise<GenerateResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false, error: "Please sign in to continue." };
    const userId = identity.tokenIdentifier;

    const keyInfo = await ctx.runQuery(internal.userSettings.getApiKey, { userId });
    if (!keyInfo) return { ok: false, error: "No API key configured. Add one in Settings." };

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
    });

    const modelName = args.model || DEFAULT_MODELS[keyInfo.provider] || "gpt-4o";
    const llm = igniteModel(keyInfo.provider, modelName, { apiKey: keyInfo.apiKey });

    const thread = [
      new Message("system", "You are a flashcard generation assistant. Return only valid JSON."),
      new Message("user", prompt),
    ];

    const response = await llm.complete(thread);
    if (!response.content) {
      return { ok: false, error: "LLM returned empty response." };
    }

    let payload: Record<string, unknown>;
    try {
      const cleaned = response.content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      payload = JSON.parse(cleaned);
    } catch {
      return { ok: false, error: "LLM response was not valid JSON.", raw: response.content };
    }

    const validation: { ok: boolean; issues: string[] } = await ctx.runQuery(
      internal.tooling.validateGeneratedSetForTool,
      { ...payload, userId } as FunctionArgs<typeof internal.tooling.validateGeneratedSetForTool>
    );

    return { ok: true, validation, payload };
  },
});

type ConfirmResult = { ok: false; error: string } | { setId: string; cardCount: number; srsEnabled: boolean };

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false, error: "Please sign in to continue." };

    type CreateResult =
      | { readonly ok: true; readonly value: never }
      | { readonly ok: false; readonly error: CommonFailure }
      | { setId: string; cardCount: number; srsEnabled: boolean };
    const result: CreateResult = await ctx.runMutation(internal.tooling.createGeneratedSetForTool, {
      name: args.name,
      description: args.description,
      sourceSetIds: args.sourceSetIds,
      sourceScope: args.sourceScope,
      weakContextMethodology: args.weakContextMethodology,
      fieldDefinitions: args.fieldDefinitions,
      cards: args.cards,
      addToSrs: args.addToSrs,
      userId: identity.tokenIdentifier,
    });

    if ("ok" in result && result.ok === false) {
      return { ok: false, error: result.error.message ?? "Failed to create set" };
    }
    return result as ConfirmResult;
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
      cardId: v.optional(v.id("flashcards")),
    })),
  },
  handler: async (ctx, args): Promise<ChatResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false, error: "Please sign in to continue." };

    const keyInfo = await ctx.runQuery(internal.userSettings.getApiKey, {
      userId: identity.tokenIdentifier,
    });
    if (!keyInfo) return { ok: false, error: "No API key configured. Add one in Settings." };

    let systemPrompt = "You are a study assistant for a flashcard app. Help the user understand their study material. Be concise and helpful.";

    if (args.context?.setId) {
      const setList = await ctx.runQuery(internal.tooling.listSetsForTool, {
        userId: identity.tokenIdentifier,
        include: { fieldDefinitions: true },
      });
      const matchedSet = setList.sets.find((s) => s.setId === args.context!.setId);
      if (matchedSet) {
        const fieldNames = matchedSet.fieldDefinitions?.map((f) => f.name).join(", ");
        systemPrompt += `\n\nThe user is studying the set "${matchedSet.name}" with fields: ${fieldNames}.`;
      }
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
