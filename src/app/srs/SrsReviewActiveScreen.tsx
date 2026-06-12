import { useReducer } from "react";
import type { CardRating } from "@/lib/types";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { useTtsControls } from "@/hooks/useTtsControls";
import CardRatingButtons from "@/components/CardRatingButtons";
import InlineError from "@/components/InlineError";
import AssistantPanel from "@/components/AssistantPanel";
import { SRS_RATING_LABELS } from "@/lib/types";
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
  const router = useRouter();
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview, {
    strategy: "queue-first",
  });
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setNote = useMutation(api.cardAnnotations.setNote);
  const tts = useTtsControls(preloadedTtsConfig);
  const { revealed, reveal } = useReviewCardState();
  const [ratingRequest, dispatchRatingRequest] = useReducer(
    ratingRequestReducer,
    { status: "idle" },
  );
  const currentItem = screenState.currentItem;
  const currentAnnotation = currentItem.annotation;

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
    <>
      {ratingRequest.status === "failed" && (
        <InlineError message={ratingRequest.message} />
      )}
      <SrsReviewActive
        currentItem={currentItem}
        reviewedCount={screenState.reviewedCount}
        totalCards={screenState.totalCards}
        tts={tts}
        onReveal={reveal}
        annotation={currentAnnotation ? { flagged: currentAnnotation.flagged, note: currentAnnotation.note } : undefined}
        onToggleFlag={() => {
          void toggleFlag({ cardId: currentItem.card._id, setId: currentItem.setId });
        }}
        onSetNote={(note: string) => {
          void setNote({ cardId: currentItem.card._id, setId: currentItem.setId, note });
        }}
        onEndSession={() => {
          if (confirm("End review session? Your progress is saved.")) {
            router.push("/");
          }
        }}
        reviewControls={
          revealed ? (
            <div className="mt-8">
              <p className="text-center text-sm text-muted mb-3">
                How well did you recall this?
              </p>
              <CardRatingButtons
                onRate={handleRate}
                disabled={ratingRequest.status === "submitting"}
                labels={SRS_RATING_LABELS}
              />
            </div>
          ) : null
        }
        assistant={
          <AssistantPanel
            context={{
              setId: currentItem.setId,
              cardId: currentItem.card._id,
              setName: currentItem.setName,
              cardFields: currentItem.card.fields,
              hasNote: Boolean(currentAnnotation?.note?.trim()),
            }}
          />
        }
      />
    </>
  );
}
