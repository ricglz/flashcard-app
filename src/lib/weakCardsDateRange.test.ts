import { describe, expect, it } from "vitest";
import {
  defaultWeakCardsDateRange,
  formatLocalDateInput,
  parseOptionalWeakCardsDateRangeParams,
  parseWeakCardsDateRange,
  parseWeakCardsDateRangeParams,
} from "./weakCardsDateRange";

describe("weak cards date range helpers", () => {
  it("formats and parses browser-local dates without UTC parsing", () => {
    const localMidday = new Date(2026, 4, 27, 12);
    expect(formatLocalDateInput(localMidday)).toBe("2026-05-27");

    const parsed = parseWeakCardsDateRange("2026-05-27", "2026-05-27");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.reviewFilter).toEqual({
        kind: "calendar_range",
        startMs: new Date(2026, 4, 27).getTime(),
        endMs: new Date(2026, 4, 28).getTime(),
      });
    }
  });

  it("defaults to the last 90 local calendar days including today", () => {
    expect(defaultWeakCardsDateRange(new Date(2026, 4, 27, 12))).toEqual({
      from: "2026-02-27",
      to: "2026-05-27",
    });
  });

  it("maps a single-day range to local midnight through the next midnight", () => {
    const parsed = parseWeakCardsDateRange("2026-01-10", "2026-01-10");

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.reviewFilter).toEqual({
        kind: "calendar_range",
        startMs: new Date(2026, 0, 10).getTime(),
        endMs: new Date(2026, 0, 11).getTime(),
      });
    }
  });

  it("rejects reversed, malformed, missing, and oversized ranges", () => {
    expect(parseWeakCardsDateRange("2026-01-11", "2026-01-10").ok).toBe(false);
    expect(parseWeakCardsDateRange("2026-02-31", "2026-03-01").ok).toBe(false);
    expect(parseWeakCardsDateRangeParams("2026-01-01", null).ok).toBe(false);
    expect(parseWeakCardsDateRange("2026-01-01", "2027-01-01").ok).toBe(false);
  });

  it("treats absent optional params differently from invalid params", () => {
    expect(parseOptionalWeakCardsDateRangeParams(null, null)).toEqual({
      status: "absent",
    });
    expect(parseOptionalWeakCardsDateRangeParams("2026-01-01", null).status).toBe(
      "invalid",
    );
    expect(parseOptionalWeakCardsDateRangeParams("2026-01-01", "2026-01-01").status).toBe(
      "valid",
    );
  });
});
