import { useReducer } from "react";
import type { CardRating } from "@/lib/types";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import SrsReviewActive from "./SrsReviewActive";
import { normalizeSrsMutationRejection } from "./srsReviewMutationResult";
import type { SrsReviewScreenState } from "./srsReviewWorkflow";
import type { SrsReviewItem } from "./srsReviewTypes";

type RatingRequest =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "failed"; message: string };

type RatingRequestAction =
  | { type: "started" }
  | { type: "succeeded" }
  | { type: "failed"; message: string };

function ratingRequestReducer(
  _state: RatingRequest,
  action: RatingRequestAction,
): RatingRequest {
  switch (action.type) {
    case "started":
      return { status: "submitting" };
    case "succeeded":
      return { status: "idle" };
    case "failed":
      return { status: "failed", message: action.message };
  }
}

export default function SrsReviewActiveScreen({
  screenState,
  preloadedTtsConfig,
  onReviewRecorded,
}: {
  screenState: Extract<
    SrsReviewScreenState<SrsReviewItem>,
    { status: "active" }
  >;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  onReviewRecorded: (rating: CardRating) => void;
}) {
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview, {
    strategy: "queue-first",
  });
  const [ratingRequest, dispatchRatingRequest] = useReducer(
    ratingRequestReducer,
    { status: "idle" },
  );
  const currentItem = screenState.currentItem;

  async function handleRate(rating: CardRating) {
    if (ratingRequest.status === "submitting") return;
    dispatchRatingRequest({ type: "started" });

    const result = await normalizeSrsMutationRejection(
      recordReview({
        srsCardId: currentItem.srsCardId,
        rating,
      }),
      "Could not record review. Try again.",
    );
    if (!result.ok) {
      dispatchRatingRequest({
        type: "failed",
        message: result.error.message,
      });
      return;
    }
    dispatchRatingRequest({ type: "succeeded" });
    onReviewRecorded(rating);
  }

  return (
    <SrsReviewActive
      screenState={screenState}
      preloadedTtsConfig={preloadedTtsConfig}
      ratingRequest={ratingRequest}
      onRate={handleRate}
    />
  );
}
