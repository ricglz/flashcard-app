import type { SrsReviewLoadMoreState } from "./srsReviewWorkflow";
import SrsReviewLoadMoreButton from "./SrsReviewLoadMoreButton";

export default function SrsReviewLoadMoreControls({
  loadMore,
  onLoadMore,
}: {
  loadMore: SrsReviewLoadMoreState;
  onLoadMore: () => void;
}) {
  switch (loadMore.status) {
    case "idle":
    case "failed":
      return (
        <SrsReviewLoadMoreButton
          onLoadMore={onLoadMore}
          label="Load more cards"
        />
      );
    case "loading":
      return (
        <SrsReviewLoadMoreButton
          onLoadMore={onLoadMore}
          label="Loading..."
          disabled
        />
      );
    case "noMoreCards":
      return (
        <>
          <SrsReviewLoadMoreButton
            onLoadMore={onLoadMore}
            label="Load more cards"
          />
          <p className="text-xs text-muted">
            No new cards available — you&apos;ve seen them all!
          </p>
        </>
      );
  }
}
