const RETRYABLE_TOOL_CALL_VALIDATION_PATTERNS = [
  "tool call validation failed",
  "attempted to call tool",
  "request.tools",
  "failed_generation",
  "failed to call a function",
];

const SANITIZED_CHAT_GENERATION_ERROR =
  "The assistant could not generate a response. Try again or choose a different model.";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isToolUnsupportedError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return message.includes("tool calling") && message.includes("not supported");
}

export function isRetryableToolCallValidationError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return RETRYABLE_TOOL_CALL_VALIDATION_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
}

export function sanitizeChatGenerationError(_error: unknown): string {
  return SANITIZED_CHAT_GENERATION_ERROR;
}
