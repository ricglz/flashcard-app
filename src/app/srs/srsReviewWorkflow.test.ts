import { describe, expect, it } from "vitest";
import {
  createSrsReviewProgressState,
  getSrsReviewScreenState,
  getSrsActiveCardCount,
  srsReviewProgressReducer,
} from "./srsReviewWorkflow";

function reduce(
  ...actions: Parameters<typeof srsReviewProgressReducer>[1][]
) {
  return actions.reduce(
    srsReviewProgressReducer,
    createSrsReviewProgressState(),
  );
}

describe("SRS review progress state", () => {
  it("tracks a successful rating as one reviewed card and one rating count", () => {
    const state = reduce({ type: "reviewRecorded", rating: "good" });

    expect(state.reviewedCount).toBe(1);
    expect(state.ratingCounts).toEqual({
      wrong: 0,
      hard: 0,
      good: 1,
      easy: 0,
    });
  });

  it("keeps the session in reconnecting state for transient empty queues", () => {
    const state = reduce({ type: "reviewRecorded", rating: "hard" });

    expect(getSrsReviewScreenState({
      state,
      activeCardCount: 0,
      initialQueueSize: 2,
      initialReviewedToday: 4,
      serverReviewedToday: 4,
    })).toMatchObject({
      status: "reconnecting",
    });
  });

  it("marks the session complete only after all initially loaded cards are reviewed", () => {
    const state = reduce(
      { type: "reviewRecorded", rating: "wrong" },
      { type: "reviewRecorded", rating: "easy" },
    );

    expect(getSrsReviewScreenState({
      state,
      activeCardCount: 0,
      initialQueueSize: 2,
      initialReviewedToday: 4,
      serverReviewedToday: 4,
    })).toMatchObject({
      status: "complete",
      reviewedToday: 6,
      reviewedCount: 2,
    });
  });

  it("keeps reviewed-today monotonic when server stats catch up first", () => {
    const state = reduce({ type: "reviewRecorded", rating: "good" });

    const screenState = getSrsReviewScreenState({
      state,
      activeCardCount: 0,
      initialQueueSize: 1,
      initialReviewedToday: 5,
      serverReviewedToday: 8,
    });

    expect(screenState.status).toBe("complete");
    if (screenState.status !== "complete") {
      throw new Error("Expected complete SRS review screen");
    }
    expect(screenState.reviewedToday).toBe(8);
  });

  it("handles live queue shrinking while local reviewed count increases", () => {
    const state = reduce(
      { type: "reviewRecorded", rating: "good" },
      { type: "reviewRecorded", rating: "hard" },
      { type: "reviewRecorded", rating: "easy" },
      { type: "reviewRecorded", rating: "good" },
      { type: "reviewRecorded", rating: "wrong" },
    );

    const activeCardCount = getSrsActiveCardCount({
      effectiveQueueSize: 5,
      reviewedCount: 5,
      initialQueueSize: 10,
    });

    const screenState = getSrsReviewScreenState({
      state,
      activeCardCount,
      initialQueueSize: 10,
      initialReviewedToday: 0,
      serverReviewedToday: 0,
    });

    expect(activeCardCount).toBe(5);
    expect(screenState.status).toBe("active");
    if (screenState.status !== "active") {
      throw new Error("Expected active SRS review screen");
    }
    expect(screenState.reviewedCount).toBe(5);
    expect(screenState.totalCards).toBe(10);
  });
});


