import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { fieldDefs, TEST_USER } from "./helpers";

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

describe("AI Effect error handling", () => {
  beforeEach(() => {
    llm.complete.mockReset();
    llm.igniteModel.mockReset();
    llm.loadModels.mockReset();
    llm.igniteModel.mockReturnValue({ complete: llm.complete });
  });

  it("returns LlmError when card generation rejects", async () => {
    llm.complete.mockRejectedValue(new Error("provider unavailable"));

    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test-key",
    });

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

  it("returns LlmError when model loading rejects", async () => {
    llm.loadModels.mockRejectedValue(new Error("models endpoint unavailable"));

    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test-key",
    });

    const result = await as.action(api.ai.getAvailableModels, {});

    expect(result).toEqual({
      ok: false,
      error: { _tag: "LlmError", message: "models endpoint unavailable" },
    });
  });
});
