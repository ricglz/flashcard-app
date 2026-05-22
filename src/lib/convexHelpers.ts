import type { Id, TableNames } from "../../convex/_generated/dataModel";

const CONVEX_ID_PATTERN = /^[a-z0-9]{16,64}$/;

/**
 * Cast a raw string (e.g. from URL params) to a Convex Id.
 * Convex rejects invalid IDs at query time, so this is safe
 * as long as queries handle null/not-found gracefully.
 */
export function asId<T extends TableNames>(raw: string): Id<T> {
  // @ts-expect-error — safe runtime coercion; Convex validates at query time
  return raw;
}

export function parseId<T extends TableNames>(raw: string): Id<T> | null {
  if (!CONVEX_ID_PATTERN.test(raw)) return null;
  return asId<T>(raw);
}
