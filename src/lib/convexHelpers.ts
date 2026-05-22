import type { Id, TableNames } from "../../convex/_generated/dataModel";

const CONVEX_ID_PATTERN = /^[a-z0-9]{16,64}$/;

/** Use only for values already sourced from Convex IDs; use parseId at string boundaries. */
export function asId<T extends TableNames>(raw: string): Id<T> {
  // @ts-expect-error — Convex IDs are branded strings at compile time.
  return raw;
}

export function parseId<T extends TableNames>(raw: string): Id<T> | null {
  if (!CONVEX_ID_PATTERN.test(raw)) return null;
  return asId<T>(raw);
}
