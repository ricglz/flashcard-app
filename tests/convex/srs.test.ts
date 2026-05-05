import { describe, it, expect } from "vitest";
import { computeSM2, computeNextReviewAt, selectNewCardsRoundRobin, SRS_DEFAULTS } from "../../convex/srs";

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
