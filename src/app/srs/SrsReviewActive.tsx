import type { CardRating } from "@/lib/types";
import { SRS_RATING_LABELS } from "@/lib/types";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import AssistantPanel from "@/components/AssistantPanel";
import CardRatingButtons from "@/components/CardRatingButtons";
import InlineError from "@/components/InlineError";
import StudyCard from "@/components/StudyCard";
import StudyLayout from "@/components/StudyLayout";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { useTtsControls } from "@/hooks/useTtsControls";
import type { SrsReviewScreenState } from "./srsReviewWorkflow";
import type { SrsReviewItem } from "./srsReviewTypes";

type RatingRequest =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "failed"; message: string };

export default function SrsReviewActive({
  screenState,
  preloadedTtsConfig,
  ratingRequest,
  onRate,
}: {
  screenState: Extract<
    SrsReviewScreenState<SrsReviewItem>,
    { status: "active" }
  >;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  ratingRequest: RatingRequest;
  onRate: (rating: CardRating) => void | Promise<void>;
}) {
  const router = useRouter();
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setNote = useMutation(api.cardAnnotations.setNote);
  const tts = useTtsControls(preloadedTtsConfig);
  const { revealed, reveal } = useReviewCardState();
  const currentItem = screenState.currentItem;
  const currentAnnotation = currentItem.annotation;

  return (
    <StudyLayout
      progress={{
        current: screenState.reviewedCount,
        total: screenState.totalCards,
      }}
      tts={tts}
      actionButton={{
        label: "End Session",
        onClick: () => {
          if (confirm("End review session? Your progress is saved.")) {
            router.push("/");
          }
        },
      }}
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
    >
      {ratingRequest.status === "failed" && (
        <InlineError message={ratingRequest.message} />
      )}

      <StudyCard
        key={currentItem._id}
        card={currentItem.card}
        fieldDefinitions={currentItem.fieldDefinitions}
        frontFields={currentItem.frontFields}
        backFields={currentItem.backFields}
        ttsOnlyFields={currentItem.ttsOnlyFields}
        onRevealed={reveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={
          currentAnnotation
            ? { flagged: currentAnnotation.flagged, note: currentAnnotation.note }
            : undefined
        }
        onToggleFlag={() => {
          void toggleFlag({
            cardId: currentItem.card._id,
            setId: currentItem.setId,
          });
        }}
        onSetNote={(note: string) => {
          void setNote({
            cardId: currentItem.card._id,
            setId: currentItem.setId,
            note,
          });
        }}
      />

      {revealed ? (
        <div className="mt-8">
          <p className="text-center text-sm text-muted mb-3">
            How well did you recall this?
          </p>
          <CardRatingButtons
            onRate={onRate}
            disabled={ratingRequest.status === "submitting"}
            labels={SRS_RATING_LABELS}
          />
        </div>
      ) : null}
    </StudyLayout>
  );
}
