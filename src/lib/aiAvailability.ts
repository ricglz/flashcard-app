export type AiAvailability =
  | { readonly available: true; readonly hasLlmKey: true }
  | { readonly available: false; readonly reason: "offline" | "no-key" | "loading" };

export function deriveAiAvailability(
  isOnline: boolean,
  queryResult: { hasLlmKey: boolean } | null | undefined,
): AiAvailability {
  if (!isOnline) return { available: false, reason: "offline" };
  if (queryResult === undefined) return { available: false, reason: "loading" };
  if (queryResult === null || !queryResult.hasLlmKey)
    return { available: false, reason: "no-key" };
  return { available: true, hasLlmKey: true };
}
