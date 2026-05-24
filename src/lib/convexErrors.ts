const CONVEX_ARGUMENT_VALIDATION_PATTERNS = [
  /ArgumentValidationError/i,
  /does not match validator v\.id\(/i,
  /not a valid ID for table/i,
  /Invalid ID/i,
] as const;

export function isConvexArgumentValidationError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

  return CONVEX_ARGUMENT_VALIDATION_PATTERNS.some((pattern) =>
    pattern.test(message),
  );
}
