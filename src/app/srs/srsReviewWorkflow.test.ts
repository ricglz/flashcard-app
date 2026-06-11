import { describe, expect, it } from "vitest";
import {
  createSrsReviewWorkflowState,
  getSrsReviewScreenState,
  srsReviewWorkflowReducer,
} from "./srsReviewWorkflow";

function reduce(
  ...actions: Parameters<typeof srsReviewWorkflowReducer>[1][]
) {
  return actions.reduce(
    srsReviewWorkflowReducer,
    createSrsReviewWorkflowState(),
  );
}

describe("SRS review workflow state", () => {
  it("tracks a successful rating as one reviewed card and one rating count", () => {
    const state = reduce(
      { type: "ratingStarted" },
      { type: "ratingSucceeded", rating: "good" },
    );

    expect(state.ratingRequest).toEqual({ status: "idle" });
    expect(state.reviewedCount).toBe(1);
    expect(state.ratingCounts).toEqual({
      wrong: 0,
      hard: 0,
      good: 1,
      easy: 0,
    });
  });

  it("records rating failures without advancing review progress", () => {
    const state = reduce(
      { type: "ratingStarted" },
      { type: "ratingFailed", message: "Review queue item not found" },
    );

    expect(state.ratingRequest).toEqual({
      status: "failed",
      message: "Review queue item not found",
    });
    expect(state.reviewedCount).toBe(0);
    expect(state.ratingCounts).toEqual(createSrsReviewWorkflowState().ratingCounts);
  });

  it("clears stale load-more errors when the user retries a rating", () => {
    const state = reduce(
      { type: "loadMoreFailed", message: "Queue is not empty" },
      { type: "ratingStarted" },
    );

    expect(state.ratingRequest).toEqual({ status: "submitting" });
    expect(state.loadMore).toEqual({ status: "idle" });
  });

  it("keeps the session in reconnecting state for transient empty queues", () => {
    const state = reduce(
      { type: "ratingStarted" },
      { type: "ratingSucceeded", rating: "hard" },
    );

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
      { type: "ratingStarted" },
      { type: "ratingSucceeded", rating: "wrong" },
      { type: "ratingStarted" },
      { type: "ratingSucceeded", rating: "easy" },
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
    const state = reduce(
      { type: "ratingStarted" },
      { type: "ratingSucceeded", rating: "good" },
    );

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

  it("tracks load-more completion when no cards are added", () => {
    const state = reduce(
      { type: "loadMoreStarted" },
      { type: "loadMoreSucceeded", added: 0 },
    );

    expect(state.loadMore).toEqual({ status: "noMoreCards" });
  });

  it("tracks load-more failures without changing review progress", () => {
    const state = reduce(
      { type: "ratingStarted" },
      { type: "ratingSucceeded", rating: "good" },
      { type: "loadMoreStarted" },
      { type: "loadMoreFailed", message: "Queue is not empty" },
    );

    expect(state.reviewedCount).toBe(1);
    expect(state.loadMore).toEqual({
      status: "failed",
      message: "Queue is not empty",
    });
    expect(getSrsReviewScreenState({
      state,
      activeCardCount: 0,
      initialQueueSize: 1,
      initialReviewedToday: 0,
      serverReviewedToday: 0,
    }).displayError).toBe("Queue is not empty");
  });
});
