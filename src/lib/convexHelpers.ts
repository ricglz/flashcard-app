import type { Id, TableNames } from "../../convex/_generated/dataModel";

const CONVEX_ID_PATTERN = /^[a-z0-9]{16,64}$/;

function brandId<T extends TableNames>(raw: string): Id<T> {
  // @ts-expect-error — Convex IDs are branded strings at compile time.
  return raw;
}

export function parseId<T extends TableNames>(raw: string): Id<T> | null {
  if (!CONVEX_ID_PATTERN.test(raw)) return null;
  return brandId<T>(raw);
}
