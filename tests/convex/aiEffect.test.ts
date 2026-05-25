import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { fieldDefs, TEST_USER } from "./helpers";
import type { GeneratedSetPayload } from "../../src/lib/aiToolingSchemas";

const llm = vi.hoisted(() => ({
  complete: vi.fn(),
  igniteModel: vi.fn(),
  loadModels: vi.fn(),
}));

vi.mock("multi-llm-ts", () => ({
  igniteModel: llm.igniteModel,
  loadModels: llm.loadModels,
  Message: class Message {
    constructor(
      readonly role: string,
      readonly content: string,
    ) {}
  },
}));

const modules = import.meta.glob("../../convex/**/*.ts");

function validPayload(overrides: Partial<GeneratedSetPayload> = {}): GeneratedSetPayload {
  return {
    name: "Vocabulary",
    description: "AI-generated flashcard set.",
    sourceSetIds: [],
    sourceScope: "custom",
    fieldDefinitions: fieldDefs,
    cards: [
      {
        fields: {
          Front: "你好",
          Back: "hello",
        },
        rationale: "A common greeting.",
      },
    ],
    addToSrs: false,
    ...overrides,
  };
}

async function configuredIdentity() {
  const t = convexTest(schema, modules);
  const as = t.withIdentity(TEST_USER);
  await as.mutation(api.userSettings.updateAiConfig, {
    provider: "openai",
    apiKey: "sk-test-key",
  });
  return as;
}

describe("AI Effect error handling", () => {
  beforeEach(() => {
    llm.complete.mockReset();
    llm.igniteModel.mockReset();
    llm.loadModels.mockReset();
    llm.igniteModel.mockReturnValue({ complete: llm.complete });
  });

  it("returns LlmError when card generation rejects", async () => {
    llm.complete.mockRejectedValue(new Error("provider unavailable"));

    const as = await configuredIdentity();

    const result = await as.action(api.ai.generateFromPrompt, {
      prompt: "Create a simple vocabulary deck.",
      fieldDefinitions: fieldDefs,
      targetCardCount: 2,
      name: "Vocabulary",
      addToSrs: false,
    });

    expect(result).toEqual({
      ok: false,
      error: { _tag: "LlmError", message: "provider unavailable" },
    });
  });

  it("returns sanitized LlmRateLimited when the provider rejects with a rate limit", async () => {
    const error = new Error(
      '429 {"error":{"message":"Rate limit reached for model `meta-llama/llama-4-scout-17b-16e-instruct` in organization `org_secret`. Please try again in 5.402s. Upgrade at https://console.groq.com/settings/billing","code":"rate_limit_exceeded"}}',
    ) as Error & { status: number; code: string };
    error.status = 429;
    error.code = "rate_limit_exceeded";
    llm.complete.mockRejectedValue(error);

    const as = await configuredIdentity();

    const result = await as.action(api.ai.generateFromPrompt, {
      prompt: "Create a simple vocabulary deck.",
      fieldDefinitions: fieldDefs,
      targetCardCount: 2,
      name: "Vocabulary",
      addToSrs: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        _tag: "LlmRateLimited",
        message: "The AI provider is rate limited. Try again in 6 seconds.",
        retryAfterSeconds: 6,
      });
      expect(result.error.message).not.toContain("org_secret");
      expect(result.error.message).not.toContain("billing");
      expect(result.error.message).not.toContain("{");
    }
  });

  it("repairs invalid JSON once before returning a generated payload", async () => {
    llm.complete
      .mockResolvedValueOnce({ content: '{"name": "broken"' })
      .mockResolvedValueOnce({ content: JSON.stringify(validPayload()) });

    const as = await configuredIdentity();

    const result = await as.action(api.ai.generateFromPrompt, {
      prompt: "Create a simple vocabulary deck.",
      fieldDefinitions: fieldDefs,
      targetCardCount: 1,
      name: "Vocabulary",
      addToSrs: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.validation.ok).toBe(true);
      expect(result.value.payload.cards).toHaveLength(1);
    }
    expect(llm.complete).toHaveBeenCalledTimes(2);
    const repairThread = llm.complete.mock.calls[1]?.[0];
    expect(repairThread?.[1]?.content).toContain("Repair Invalid Flashcard JSON");
    expect(llm.complete.mock.calls[0]?.[1]).toMatchObject({
      temperature: 0.2,
      structuredOutput: { name: "generated_flashcard_set" },
    });
    expect(llm.complete.mock.calls[1]?.[1]).toMatchObject({
      temperature: 0,
      structuredOutput: { name: "generated_flashcard_set" },
    });
  });

  it("returns sanitized LlmInvalidPayload after repair fails", async () => {
    llm.complete
      .mockResolvedValueOnce({ content: '{"name": "broken"' })
      .mockResolvedValueOnce({ content: '{"still": "broken"' });

    const as = await configuredIdentity();

    const result = await as.action(api.ai.generateFromPrompt, {
      prompt: "Create a simple vocabulary deck.",
      fieldDefinitions: fieldDefs,
      targetCardCount: 1,
      name: "Vocabulary",
      addToSrs: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("LlmInvalidPayload");
      expect(result.error.message).toBe(
        "The model returned incomplete cards. Try fewer cards, clearer instructions, or a different model.",
      );
      expect(result.error).not.toHaveProperty("raw");
    }
    expect(llm.complete).toHaveBeenCalledTimes(2);
  });

  it("refines an existing generated payload", async () => {
    llm.complete.mockResolvedValue({
      content: JSON.stringify(validPayload({
        cards: [
          {
            fields: {
              Front: "早上好",
              Back: "good morning",
            },
            rationale: "A realistic greeting.",
          },
        ],
      })),
    });

    const as = await configuredIdentity();

    const result = await as.action(api.ai.refineGeneratedSet, {
      draft: validPayload(),
      instructions: "Make the cards more realistic.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.validation.ok).toBe(true);
      expect(result.value.payload.cards[0]?.fields.Front).toBe("早上好");
    }
    const thread = llm.complete.mock.calls[0]?.[0];
    expect(thread?.[1]?.content).toContain("Refine Generated Flashcards");
  });

  it("returns LlmError when model loading rejects", async () => {
    llm.loadModels.mockRejectedValue(new Error("models endpoint unavailable"));

    const as = await configuredIdentity();

    const result = await as.action(api.ai.getAvailableModels, {});

    expect(result).toEqual({
      ok: false,
      error: { _tag: "LlmError", message: "models endpoint unavailable" },
    });
  });
});
