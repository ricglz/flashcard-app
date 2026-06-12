import { useReducer } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import InlineError from "@/components/InlineError";
import SrsReviewComplete from "./SrsReviewComplete";
import SrsReviewLoadMoreControls from "./SrsReviewLoadMoreControls";
import { normalizeSrsMutationRejection } from "./srsReviewMutationResult";
import type {
  SrsReviewLoadMoreState,
  SrsReviewScreenState,
} from "./srsReviewWorkflow";

type LoadMoreAction =
  | { type: "started" }
  | { type: "succeeded"; added: number }
  | { type: "failed"; message: string };

function loadMoreReducer(
  _state: SrsReviewLoadMoreState,
  action: LoadMoreAction,
): SrsReviewLoadMoreState {
  switch (action.type) {
    case "started":
      return { status: "loading" };
    case "succeeded":
      return action.added === 0 ? { status: "noMoreCards" } : { status: "idle" };
    case "failed":
      return { status: "failed", message: action.message };
  }
}

export default function SrsReviewCompleteScreen({
  screenState,
}: {
  screenState: Extract<SrsReviewScreenState, { status: "complete" }>;
}) {
  const forceRefreshQueue = useMutation(api.srsReviewQueue.forceRefreshQueue);
  const [loadMore, dispatchLoadMore] = useReducer(
    loadMoreReducer,
    { status: "idle" },
  );

  async function handleLoadMore() {
    if (loadMore.status === "loading") return;
    dispatchLoadMore({ type: "started" });
    const result = await normalizeSrsMutationRejection(
      forceRefreshQueue(),
      "Could not load more cards. Try again.",
    );
    if (!result.ok) {
      dispatchLoadMore({
        type: "failed",
        message: result.error.message,
      });
      return;
    }
    dispatchLoadMore({ type: "succeeded", added: result.value.added });
  }

  return (
    <>
      {loadMore.status === "failed" && (
        <InlineError message={loadMore.message} />
      )}
      <SrsReviewComplete
        reviewedCount={screenState.reviewedCount}
        ratingCounts={screenState.ratingCounts}
        reviewedToday={screenState.reviewedToday}
        actions={
          <SrsReviewLoadMoreControls
            loadMore={loadMore}
            onLoadMore={handleLoadMore}
          />
        }
      />
    </>
  );
}
