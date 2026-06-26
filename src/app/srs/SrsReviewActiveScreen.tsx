import { useCallback, useMemo, useReducer } from "react";
import type { CardRating } from "@/lib/types";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import SrsReviewActive from "./SrsReviewActive";
import { normalizeSrsMutationRejection } from "./srsReviewMutationResult";
import type { SrsReviewScreenState } from "./srsReviewWorkflow";
import type { SrsReviewSessionData } from "./useSrsReviewSessionController";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";

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
  state,
  data,
  preloadedTtsConfig,
}: {
  state: Extract<SrsReviewScreenState, { status: "active" }>;
  data: SrsReviewSessionData;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
}) {
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview, {
    strategy: "queue-first",
  });
  const [ratingRequest, dispatchRatingRequest] = useReducer(
    ratingRequestReducer,
    { status: "idle" },
  );

  const { revealed, reveal, resetReveal } = useReviewCardState();

  const navigation = useCardNavigation({
    orderedIds: data.orderedIds,
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: () => {
      dispatchRatingRequest({ type: "succeeded" });
      resetReveal();
    },
  });

  const currentItem = useMemo(
    () =>
      navigation.currentId
        ? (data.effectiveQueue.find((item) => item._id === navigation.currentId) ??
          null)
        : null,
    [data.effectiveQueue, navigation.currentId],
  );

  const onReviewRecorded = useCallback(
    (rating: CardRating) => {
      data.dispatchWorkflow({ type: "reviewRecorded", rating });
      navigation.hideCurrent();
    },
    [data, navigation],
  );

  async function handleRate(rating: CardRating) {
    if (ratingRequest.status === "submitting") return;
    if (!currentItem) return;
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

  if (!currentItem) {
    return null;
  }

  return (
    <SrsReviewActive
      screenState={state}
      currentItem={currentItem}
      preloadedTtsConfig={preloadedTtsConfig}
      ratingRequest={ratingRequest}
      onRate={handleRate}
      revealed={revealed}
      onReveal={reveal}
    />
  );
}
