import type { CardRating } from "@/lib/types";

export type SrsReviewRatingCounts = Record<CardRating, number>;

type IdleRatingRequest = { status: "idle" };
type SubmittingRatingRequest = { status: "submitting" };
type FailedRatingRequest = { status: "failed"; message: string };

export type SrsReviewRatingRequest =
  | IdleRatingRequest
  | SubmittingRatingRequest
  | FailedRatingRequest;

type IdleLoadMoreState = { status: "idle" };
type LoadingMoreState = { status: "loading" };
type NoMoreCardsState = { status: "noMoreCards" };
type FailedLoadMoreState = { status: "failed"; message: string };

export type SrsReviewLoadMoreState =
  | IdleLoadMoreState
  | LoadingMoreState
  | NoMoreCardsState
  | FailedLoadMoreState;

export type SrsReviewScreenState =
  | {
      status: "active";
      displayError: string | null;
      reviewedCount: number;
      totalCards: number;
      isSubmittingRating: boolean;
    }
  | { status: "reconnecting"; displayError: string | null }
  | {
      status: "complete";
      displayError: string | null;
      reviewedCount: number;
      ratingCounts: SrsReviewRatingCounts;
      reviewedToday: number;
      loadMore: SrsReviewLoadMoreState;
    };

export type SrsReviewWorkflowState = {
  ratingRequest: SrsReviewRatingRequest;
  reviewedCount: number;
  ratingCounts: SrsReviewRatingCounts;
  loadMore: SrsReviewLoadMoreState;
};

export type SrsReviewWorkflowAction =
  | { type: "ratingStarted" }
  | { type: "ratingSucceeded"; rating: CardRating }
  | { type: "ratingFailed"; message: string }
  | { type: "loadMoreStarted" }
  | { type: "loadMoreSucceeded"; added: number }
  | { type: "loadMoreFailed"; message: string };

export function createSrsReviewWorkflowState(): SrsReviewWorkflowState {
  return {
    ratingRequest: { status: "idle" },
    reviewedCount: 0,
    ratingCounts: {
      wrong: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    loadMore: { status: "idle" },
  };
}

function resetFailedLoadMore(_loadMore: FailedLoadMoreState): IdleLoadMoreState {
  return { status: "idle" };
}

function loadMoreFromAddedCount(added: number): IdleLoadMoreState | NoMoreCardsState {
  return added === 0 ? { status: "noMoreCards" } : { status: "idle" };
}

function getRequestMessage(
  request: FailedRatingRequest | FailedLoadMoreState,
) {
  return request.message;
}

export function srsReviewWorkflowReducer(
  state: SrsReviewWorkflowState,
  action: SrsReviewWorkflowAction,
): SrsReviewWorkflowState {
  switch (action.type) {
    case "ratingStarted":
      return {
        ...state,
        ratingRequest: { status: "submitting" },
        loadMore:
          state.loadMore.status === "failed"
            ? resetFailedLoadMore(state.loadMore)
            : state.loadMore,
      };
    case "ratingSucceeded":
      return {
        ...state,
        ratingRequest: { status: "idle" },
        reviewedCount: state.reviewedCount + 1,
        ratingCounts: {
          ...state.ratingCounts,
          [action.rating]: state.ratingCounts[action.rating] + 1,
        },
      };
    case "ratingFailed":
      return {
        ...state,
        ratingRequest: { status: "failed", message: action.message },
      };
    case "loadMoreStarted":
      return {
        ...state,
        loadMore: { status: "loading" },
      };
    case "loadMoreSucceeded":
      return {
        ...state,
        loadMore: loadMoreFromAddedCount(action.added),
      };
    case "loadMoreFailed":
      return {
        ...state,
        loadMore: { status: "failed", message: action.message },
      };
  }
}

export function getSrsReviewScreenState({
  state,
  activeCardCount,
  initialQueueSize,
  initialReviewedToday,
  serverReviewedToday,
}: {
  state: SrsReviewWorkflowState;
  activeCardCount: number;
  initialQueueSize: number;
  initialReviewedToday: number;
  serverReviewedToday: number;
}): SrsReviewScreenState {
  const isComplete =
    activeCardCount === 0 && state.reviewedCount >= initialQueueSize;
  const reviewError =
    state.ratingRequest.status === "failed"
      ? getRequestMessage(state.ratingRequest)
      : null;
  const loadMoreError =
    state.loadMore.status === "failed"
      ? getRequestMessage(state.loadMore)
      : null;
  const displayError = reviewError ?? loadMoreError;
  const reviewedToday = Math.max(
    serverReviewedToday,
    initialReviewedToday + state.reviewedCount,
  );

  if (isComplete) {
    return {
      status: "complete",
      displayError,
      reviewedCount: state.reviewedCount,
      ratingCounts: state.ratingCounts,
      reviewedToday,
      loadMore: state.loadMore,
    };
  }

  if (activeCardCount === 0) {
    return { status: "reconnecting", displayError };
  }

  return {
    status: "active",
    displayError,
    reviewedCount: state.reviewedCount,
    totalCards: activeCardCount + state.reviewedCount,
    isSubmittingRating: state.ratingRequest.status === "submitting",
  };
}
