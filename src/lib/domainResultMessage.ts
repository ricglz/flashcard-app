export function getFailureMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.trim();
    if (message.length > 0) return message;
  }

  return fallback;
}
