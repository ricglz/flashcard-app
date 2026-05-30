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

  it("keeps nested object keys stable without collapsing distinct nested values", () => {
    const first = buildCacheKey("tooling:getWeakCardsPublic", {
      scope: { kind: "sets", setIds: ["set1", "set2"] },
      filters: { reviewFilter: { kind: "last_n_days", days: 30 } },
    });
    const second = buildCacheKey("tooling:getWeakCardsPublic", {
      filters: { reviewFilter: { days: 30, kind: "last_n_days" } },
      scope: { setIds: ["set1", "set2"], kind: "sets" },
    });
    const differentNestedValue = buildCacheKey("tooling:getWeakCardsPublic", {
      scope: { kind: "sets", setIds: ["set1", "set2"] },
      filters: { reviewFilter: { kind: "last_n_days", days: 7 } },
    });

    expect(first).toBe(second);
    expect(first).not.toBe(differentNestedValue);
  });

  it("preserves array order in nested arguments", () => {
    expect(
      buildCacheKey("tooling:getWeakCardsPublic", {
        scope: { kind: "sets", setIds: ["set1", "set2"] },
      }),
    ).not.toBe(
      buildCacheKey("tooling:getWeakCardsPublic", {
        scope: { kind: "sets", setIds: ["set2", "set1"] },
      }),
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
