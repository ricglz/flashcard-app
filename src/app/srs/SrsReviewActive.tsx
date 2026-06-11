import type { ReactNode } from "react";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import StudyLayout from "@/components/StudyLayout";
import type { useTtsControls } from "@/hooks/useTtsControls";
import type { CardRating } from "@/lib/types";
import type { SrsReviewItem } from "./srsReviewTypes";
import { SRS_RATING_LABELS } from "@/lib/types";

export default function SrsReviewActive({
  currentItem,
  reviewedCount,
  totalCards,
  revealed,
  isSubmitting,
  tts,
  onReveal,
  onRate,
  onEndSession,
  annotation,
  onToggleFlag,
  onSetNote,
  assistant,
}: {
  currentItem: SrsReviewItem;
  reviewedCount: number;
  totalCards: number;
  revealed: boolean;
  isSubmitting: boolean;
  tts: ReturnType<typeof useTtsControls>;
  onReveal: () => void;
  onRate: (rating: CardRating) => void;
  onEndSession: () => void;
  annotation?: { flagged: boolean; note?: string };
  onToggleFlag?: () => void;
  onSetNote?: (note: string) => void;
  assistant?: ReactNode;
}) {
  return (
    <StudyLayout
      progress={{ current: reviewedCount, total: totalCards }}
      tts={tts}
      actionButton={{ label: "End Session", onClick: onEndSession }}
      assistant={assistant}
    >
      <StudyCard
        key={currentItem._id}
        card={currentItem.card}
        fieldDefinitions={currentItem.fieldDefinitions}
        frontFields={currentItem.frontFields}
        backFields={currentItem.backFields}
        ttsOnlyFields={currentItem.ttsOnlyFields}
        onRevealed={onReveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={annotation}
        onToggleFlag={onToggleFlag}
        onSetNote={onSetNote}
      />

      {revealed && (
        <div className="mt-8">
          <p className="text-center text-sm text-muted mb-3">
            How well did you recall this?
          </p>
          <CardRatingButtons
            onRate={onRate}
            disabled={isSubmitting}
            labels={SRS_RATING_LABELS}
          />
        </div>
      )}
    </StudyLayout>
  );
}
