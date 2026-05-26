import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { buildCacheKey } from "./useOfflineQuery";

describe("buildCacheKey", () => {
  it("builds query cache keys from query names and args", () => {
    expect(
      buildCacheKey("progress:getDailyHistory", { days: 7 }),
    ).toBe('progress:getDailyHistory:{"days":7}');
  });

  it("keeps cache keys stable when argument insertion order changes", () => {
    expect(
      buildCacheKey("progress:getDailyHistory", { days: 7, foo: "x" }),
    ).toBe(
      buildCacheKey("progress:getDailyHistory", { foo: "x", days: 7 }),
    );
  });

  it("uses only the query name when args are undefined or null", () => {
    expect(buildCacheKey("progress:getDailyHistory", undefined)).toBe(
      "progress:getDailyHistory",
    );
    expect(buildCacheKey("progress:getDailyHistory", null)).toBe(
      "progress:getDailyHistory",
    );
  });

  it("resolves Convex function references to query names", () => {
    expect(buildCacheKey(api.progress.getDailyHistory, { days: 7 })).toBe(
      'progress:getDailyHistory:{"days":7}',
    );
  });
});
