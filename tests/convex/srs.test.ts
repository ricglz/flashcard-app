import { describe, it, expect, vi, afterEach } from "vitest";
import { computeSM2, computeNextReviewAt, selectNewCardsRoundRobin, computeDayStartMs, computeDayKey, SRS_DEFAULTS } from "../../convex/srs";

describe("computeSM2", () => {
  const defaults = {
    easeFactor: SRS_DEFAULTS.INITIAL_EASE_FACTOR,
    interval: SRS_DEFAULTS.INITIAL_INTERVAL,
    repetitions: SRS_DEFAULTS.INITIAL_REPETITIONS,
  };

  describe("Again (wrong)", () => {
    it("resets repetitions to 0 and sets interval to 1", () => {
      const result = computeSM2({ ...defaults, rating: "wrong", repetitions: 5, interval: 30 });
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.status).toBe("learning");
    });

    it("decreases ease factor by 0.2", () => {
      const result = computeSM2({ ...defaults, rating: "wrong" });
      expect(result.easeFactor).toBe(2.3);
    });

    it("does not reduce ease factor below 1.3", () => {
      const result = computeSM2({ ...defaults, rating: "wrong", easeFactor: 1.4 });
      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe("Hard", () => {
    it("increases interval modestly (1.2x)", () => {
      const result = computeSM2({ ...defaults, rating: "hard", interval: 10, repetitions: 2 });
      expect(result.interval).toBe(12);
    });

    it("decreases ease factor by 0.15", () => {
      const result = computeSM2({ ...defaults, rating: "hard" });
      expect(result.easeFactor).toBe(2.35);
    });

    it("does not reduce ease factor below 1.3", () => {
      const result = computeSM2({ ...defaults, rating: "hard", easeFactor: 1.35 });
      expect(result.easeFactor).toBe(1.3);
    });

    it("ensures interval is at least 1", () => {
      const result = computeSM2({ ...defaults, rating: "hard", interval: 0 });
      expect(result.interval).toBe(1);
    });

    it("increments repetitions", () => {
      const result = computeSM2({ ...defaults, rating: "hard", repetitions: 3 });
      expect(result.repetitions).toBe(4);
    });
  });

  describe("Good", () => {
    it("sets interval to 1 on first review", () => {
      const result = computeSM2({ ...defaults, rating: "good" });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.status).toBe("learning");
    });

    it("sets interval to 6 on second review", () => {
      const result = computeSM2({ ...defaults, rating: "good", repetitions: 1, interval: 1 });
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
      expect(result.status).toBe("review");
    });

    it("multiplies interval by ease factor on subsequent reviews", () => {
      const result = computeSM2({ ...defaults, rating: "good", repetitions: 2, interval: 6 });
      expect(result.interval).toBe(Math.round(6 * 2.5));
      expect(result.repetitions).toBe(3);
      expect(result.status).toBe("review");
    });

    it("does not change ease factor", () => {
      const result = computeSM2({ ...defaults, rating: "good" });
      expect(result.easeFactor).toBe(2.5);
    });
  });

  describe("Easy", () => {
    it("sets interval to 1 on first review", () => {
      const result = computeSM2({ ...defaults, rating: "easy" });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it("sets interval to 6 on second review", () => {
      const result = computeSM2({ ...defaults, rating: "easy", repetitions: 1, interval: 1 });
      expect(result.interval).toBe(6);
    });

    it("applies 1.3x bonus on subsequent reviews", () => {
      const result = computeSM2({ ...defaults, rating: "easy", repetitions: 2, interval: 6 });
      expect(result.interval).toBe(Math.round(6 * 2.5 * 1.3));
    });

    it("increases ease factor by 0.15", () => {
      const result = computeSM2({ ...defaults, rating: "easy" });
      expect(result.easeFactor).toBe(2.65);
    });
  });

  describe("status transitions", () => {
    it("new card rated Good stays learning after first review", () => {
      const result = computeSM2({ ...defaults, rating: "good" });
      expect(result.status).toBe("learning");
    });

    it("transitions to review after 2 successful reviews", () => {
      const first = computeSM2({ ...defaults, rating: "good" });
      const second = computeSM2({ ...first, rating: "good" });
      expect(second.status).toBe("review");
    });

    it("Again sends review card back to learning", () => {
      const result = computeSM2({
        rating: "wrong",
        easeFactor: 2.5,
        interval: 15,
        repetitions: 5,
      });
      expect(result.status).toBe("learning");
    });
  });
});

describe("computeNextReviewAt", () => {
  it("adds interval days as milliseconds", () => {
    const now = 1000000;
    const interval = 3;
    const result = computeNextReviewAt(interval, now);
    expect(result).toBe(now + 3 * 24 * 60 * 60 * 1000);
  });

  it("returns now for zero interval", () => {
    const now = 1000000;
    expect(computeNextReviewAt(0, now)).toBe(now);
  });
});

describe("selectNewCardsRoundRobin", () => {
  it("distributes evenly across sets", () => {
    const setA = ["A1", "A2", "A3", "A4"];
    const setB = ["B1", "B2", "B3", "B4"];
    const setC = ["C1", "C2", "C3", "C4"];
    const result = selectNewCardsRoundRobin([setA, setB, setC], 9);
    expect(result).toEqual(["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"]);
  });

  it("handles unequal set sizes", () => {
    const setA = ["A1"];
    const setB = ["B1", "B2", "B3", "B4"];
    const result = selectNewCardsRoundRobin([setA, setB], 5);
    expect(result).toEqual(["A1", "B1", "B2", "B3", "B4"]);
  });

  it("caps at the global limit", () => {
    const setA = ["A1", "A2", "A3"];
    const setB = ["B1", "B2", "B3"];
    const result = selectNewCardsRoundRobin([setA, setB], 3);
    expect(result).toEqual(["A1", "B1", "A2"]);
  });

  it("returns empty when limit is 0", () => {
    const result = selectNewCardsRoundRobin([["A1", "A2"]], 0);
    expect(result).toEqual([]);
  });

  it("returns empty when no sets provided", () => {
    const result = selectNewCardsRoundRobin([], 10);
    expect(result).toEqual([]);
  });

  it("returns all cards when limit exceeds total available", () => {
    const setA = ["A1", "A2"];
    const setB = ["B1"];
    const result = selectNewCardsRoundRobin([setA, setB], 100);
    expect(result).toEqual(["A1", "B1", "A2"]);
  });

  it("works with a single set", () => {
    const result = selectNewCardsRoundRobin([["A1", "A2", "A3"]], 2);
    expect(result).toEqual(["A1", "A2"]);
  });

  it("handles negative limit", () => {
    const result = selectNewCardsRoundRobin([["A1"]], -5);
    expect(result).toEqual([]);
  });
});

describe("computeDayStartMs", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today at the reset hour when current time is past it", () => {
    // 2025-06-15 10:30:00 UTC — past hour 4
    vi.setSystemTime(new Date("2025-06-15T10:30:00Z"));
    const result = computeDayStartMs(4);
    expect(result).toBe(new Date("2025-06-15T04:00:00Z").getTime());
  });

  it("returns yesterday at the reset hour when current time is before it", () => {
    // 2025-06-15 02:00:00 UTC — before hour 4
    vi.setSystemTime(new Date("2025-06-15T02:00:00Z"));
    const result = computeDayStartMs(4);
    expect(result).toBe(new Date("2025-06-14T04:00:00Z").getTime());
  });

  it("handles midnight (hour 0) correctly", () => {
    // 2025-06-15 15:00:00 UTC — well past midnight
    vi.setSystemTime(new Date("2025-06-15T15:00:00Z"));
    const result = computeDayStartMs(0);
    expect(result).toBe(new Date("2025-06-15T00:00:00Z").getTime());
  });

  it("handles hour 23 correctly", () => {
    // 2025-06-15 22:00:00 UTC — before hour 23
    vi.setSystemTime(new Date("2025-06-15T22:00:00Z"));
    const result = computeDayStartMs(23);
    expect(result).toBe(new Date("2025-06-14T23:00:00Z").getTime());
  });

  it("always returns a time <= now", () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:01Z"));
    for (const hour of [0, 4, 12, 23]) {
      expect(computeDayStartMs(hour)).toBeLessThanOrEqual(Date.now());
    }
  });
});

describe("computeDayKey", () => {
  afterEach(() => vi.useRealTimers());

  it("returns ISO date of the day boundary", () => {
    vi.setSystemTime(new Date("2026-05-06T10:00:00Z"));
    expect(computeDayKey(4)).toBe("2026-05-06");
  });

  it("returns previous day when before reset hour", () => {
    vi.setSystemTime(new Date("2026-05-06T03:00:00Z"));
    expect(computeDayKey(4)).toBe("2026-05-05");
  });

  it("handles midnight reset", () => {
    vi.setSystemTime(new Date("2026-05-06T23:30:00Z"));
    expect(computeDayKey(0)).toBe("2026-05-06");
  });

  it("handles reset at exactly the boundary", () => {
    vi.setSystemTime(new Date("2026-05-06T04:00:00Z"));
    expect(computeDayKey(4)).toBe("2026-05-06");
  });
});
