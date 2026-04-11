import type { Id, TableNames } from "../../convex/_generated/dataModel";

/**
 * Cast a raw string (e.g. from URL params) to a Convex Id.
 * Convex rejects invalid IDs at query time, so this is safe
 * as long as queries handle null/not-found gracefully.
 */
export function asId<T extends TableNames>(raw: string): Id<T> {
  return raw as unknown as Id<T>;
}
