import { describe, expect, it } from "vitest";
import {
  createSrsReviewProgressState,
  getSrsReviewScreenState,
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
      currentItem: null,
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
      currentItem: null,
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
      currentItem: null,
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

  it("treats a missing current item as reconnecting even when active ids remain", () => {
    const state = createSrsReviewProgressState();

    expect(getSrsReviewScreenState({
      state,
      activeCardCount: 1,
      currentItem: null,
      initialQueueSize: 1,
      initialReviewedToday: 0,
      serverReviewedToday: 0,
    })).toMatchObject({
      status: "reconnecting",
    });
  });
});
