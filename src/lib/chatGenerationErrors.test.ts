import { describe, expect, it } from "vitest";
import {
  isRetryableToolCallValidationError,
  isToolUnsupportedError,
  sanitizeChatGenerationError,
} from "./chatGenerationErrors";

describe("chat generation error helpers", () => {
  it("detects failed_generation function-call provider failures", () => {
    const error = new Error(
      "400 Failed to call a function. Please adjust your prompt. See 'failed_generation' for more details.",
    );

    expect(isRetryableToolCallValidationError(error)).toBe(true);
  });

  it("detects tool validation failures for null tool calls", () => {
    const error = new Error(
      "400 tool call validation failed: attempted to call tool 'null' which was not in request.tools",
    );

    expect(isRetryableToolCallValidationError(error)).toBe(true);
  });

  it("keeps unsupported tool errors separate from malformed tool-call errors", () => {
    const unsupported = new Error("tool calling is not supported by this model");

    expect(isToolUnsupportedError(unsupported)).toBe(true);
    expect(isRetryableToolCallValidationError(unsupported)).toBe(false);
  });

  it("sanitizes user-facing generation errors", () => {
    expect(sanitizeChatGenerationError(new Error("provider raw error"))).toBe(
      "The assistant could not generate a response. Try again or choose a different model.",
    );
  });
});
