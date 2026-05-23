import { describe, expect, it } from "vitest";
import {
  computeOverallScore,
  computeScorePercent,
  countRatings,
  createEmptyRatingCounts,
  ratingPercentage,
} from "./studyResults";

describe("studyResults", () => {
  it("creates empty counts for every rating", () => {
    expect(createEmptyRatingCounts()).toEqual({
      wrong: 0,
      hard: 0,
      good: 0,
      easy: 0,
    });
  });

  it("counts ratings", () => {
    expect(
      countRatings([
        { rating: "wrong" },
        { rating: "good" },
        { rating: "good" },
        { rating: "easy" },
      ]),
    ).toEqual({
      wrong: 1,
      hard: 0,
      good: 2,
      easy: 1,
    });
  });

  it("computes overall score on the same 0 to 1 scale as sessions", () => {
    expect(
      computeOverallScore([
        { rating: "wrong" },
        { rating: "hard" },
        { rating: "good" },
        { rating: "easy" },
      ]),
    ).toBe(0.5);
  });

  it("uses persisted score when present", () => {
    expect(computeScorePercent([{ rating: "wrong" }], 0.75)).toBe(75);
  });

  it("computes rating percentages defensively for empty totals", () => {
    expect(ratingPercentage(1, 4)).toBe(25);
    expect(ratingPercentage(1, 0)).toBe(0);
  });
});
