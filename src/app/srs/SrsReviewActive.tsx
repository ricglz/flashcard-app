import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import SrsReviewHeader from "./SrsReviewHeader";
import type {
  CardRating} from "@/lib/types";
import {
  SRS_RATING_LABELS,
  type FieldDefinition,
} from "@/lib/types";

export default function SrsReviewActive({
  currentItem,
  reviewedCount,
  totalCards,
  revealed,
  isSubmitting,
  ttsEnabled,
  ttsRate,
  ttsSpeed,
  onReveal,
  onRate,
  onToggleTts,
  onTtsSpeedChange,
  onEndSession,
  annotation,
  onToggleFlag,
  onSetNote,
}: {
  currentItem: {
    _id: string;
    srsCardId: string;
    setId: string;
    card: { _id: string; fields: Record<string, string> };
    fieldDefinitions: FieldDefinition[];
    frontFields: string[];
    backFields: string[];
    ttsOnlyFields: string[];
  };
  reviewedCount: number;
  totalCards: number;
  revealed: boolean;
  isSubmitting: boolean;
  ttsEnabled: boolean;
  ttsRate: number | undefined;
  ttsSpeed: number;
  onReveal: () => void;
  onRate: (rating: CardRating) => void;
  onToggleTts: () => void;
  onTtsSpeedChange: (speed: number) => void;
  onEndSession: () => void;
  annotation?: { flagged: boolean; note?: string };
  onToggleFlag?: () => void;
  onSetNote?: (note: string) => void;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <SrsReviewHeader
        reviewedCount={reviewedCount}
        totalCards={totalCards}
        ttsSpeed={ttsSpeed}
        onTtsSpeedChange={onTtsSpeedChange}
        ttsEnabled={ttsEnabled}
        onToggleTts={onToggleTts}
        onEndSession={onEndSession}
      />

      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(reviewedCount / totalCards) * 100}%`,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <StudyCard
          key={currentItem._id}
          card={currentItem.card}
          fieldDefinitions={currentItem.fieldDefinitions}
          frontFields={currentItem.frontFields}
          backFields={currentItem.backFields}
          ttsOnlyFields={currentItem.ttsOnlyFields}
          onRevealed={onReveal}
          autoPlayTts={ttsEnabled}
          ttsRate={ttsRate}
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
      </main>
    </div>
  );
}
