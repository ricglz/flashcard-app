import Link from "next/link";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";
import {
  CardRating,
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
}: {
  currentItem: {
    _id: string;
    srsCardId: string;
    card: { _id: string; fields: Record<string, string> };
    fieldDefinitions: FieldDefinition[];
    frontFields: string[];
    backFields: string[];
    ttsOnlyFields?: string[];
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
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Dashboard
          </Link>
          <span className="text-sm text-muted">
            {reviewedCount + 1} / {totalCards}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TtsSpeedControl speed={ttsSpeed} onSpeedChange={onTtsSpeedChange} />
          <button
            onClick={onToggleTts}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
            aria-label={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            <SpeakerIcon muted={!ttsEnabled} />
          </button>
          <button
            onClick={onEndSession}
            className="text-sm text-danger hover:text-danger-hover transition-colors"
          >
            End Session
          </button>
        </div>
      </header>

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
          ttsOnlyFields={currentItem.ttsOnlyFields ?? []}
          onRevealed={onReveal}
          autoPlayTts={ttsEnabled}
          ttsRate={ttsRate}
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
