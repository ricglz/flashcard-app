import { fail, invalidInput, ok, type CommonFailure, type DomainResult } from "../domain/result";

export function normalizeClientTimestamp(
  timestamp: number | undefined,
  now = Date.now(),
): DomainResult<number, CommonFailure> {
  if (timestamp === undefined) return ok(now);
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    return fail(invalidInput("Timestamp must be a finite non-negative number.", "timestamp"));
  }
  return ok(Math.min(timestamp, now));
}
