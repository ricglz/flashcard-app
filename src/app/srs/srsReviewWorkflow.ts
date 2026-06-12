import type { CardRating } from "@/lib/types";

export type SrsReviewRatingCounts = Record<CardRating, number>;

type IdleLoadMoreState = { status: "idle" };
type LoadingMoreState = { status: "loading" };
type NoMoreCardsState = { status: "noMoreCards" };
type FailedLoadMoreState = { status: "failed"; message: string };

export type SrsReviewLoadMoreState =
  | IdleLoadMoreState
  | LoadingMoreState
  | NoMoreCardsState
  | FailedLoadMoreState;

export type SrsReviewScreenState<TCurrentItem = unknown> =
  | {
      status: "active";
      currentItem: TCurrentItem;
      reviewedCount: number;
      totalCards: number;
    }
  | { status: "reconnecting" }
  | {
      status: "complete";
      reviewedCount: number;
      ratingCounts: SrsReviewRatingCounts;
      reviewedToday: number;
    };

export type SrsReviewProgressState = {
  reviewedCount: number;
  ratingCounts: SrsReviewRatingCounts;
};

export type SrsReviewProgressAction = {
  type: "reviewRecorded";
  rating: CardRating;
};

export function createSrsReviewProgressState(): SrsReviewProgressState {
  return {
    reviewedCount: 0,
    ratingCounts: {
      wrong: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
  };
}

export function srsReviewProgressReducer(
  state: SrsReviewProgressState,
  action: SrsReviewProgressAction,
): SrsReviewProgressState {
  return {
    reviewedCount: state.reviewedCount + 1,
    ratingCounts: {
      ...state.ratingCounts,
      [action.rating]: state.ratingCounts[action.rating] + 1,
    },
  };
}

export function getSrsReviewScreenState<TCurrentItem>({
  state,
  activeCardCount,
  currentItem,
  initialQueueSize,
  initialReviewedToday,
  serverReviewedToday,
}: {
  state: SrsReviewProgressState;
  activeCardCount: number;
  currentItem: TCurrentItem | null;
  initialQueueSize: number;
  initialReviewedToday: number;
  serverReviewedToday: number;
}): SrsReviewScreenState<TCurrentItem> {
  const isComplete =
    activeCardCount === 0 && state.reviewedCount >= initialQueueSize;
  const reviewedToday = Math.max(
    serverReviewedToday,
    initialReviewedToday + state.reviewedCount,
  );

  if (isComplete) {
    return {
      status: "complete",
      reviewedCount: state.reviewedCount,
      ratingCounts: state.ratingCounts,
      reviewedToday,
    };
  }

  if (activeCardCount === 0 || currentItem === null) {
    return { status: "reconnecting" };
  }

  return {
    status: "active",
    currentItem,
    reviewedCount: state.reviewedCount,
    totalCards: activeCardCount + state.reviewedCount,
  };
}
