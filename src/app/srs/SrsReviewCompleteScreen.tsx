import InlineError from "@/components/InlineError";
import SrsReviewComplete from "./SrsReviewComplete";
import type { SrsReviewScreenState } from "./srsReviewWorkflow";

export default function SrsReviewCompleteScreen({
  screenState,
  onLoadMore,
}: {
  screenState: Extract<SrsReviewScreenState, { status: "complete" }>;
  onLoadMore: () => void;
}) {
  return (
    <>
      <InlineError message={screenState.displayError} />
      <SrsReviewComplete
        reviewedCount={screenState.reviewedCount}
        ratingCounts={screenState.ratingCounts}
        reviewedToday={screenState.reviewedToday}
        onLoadMore={onLoadMore}
        loadMore={screenState.loadMore}
      />
    </>
  );
}
