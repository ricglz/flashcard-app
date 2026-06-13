"use client";

import type { Id } from "../../../convex/_generated/dataModel";
import StudyLayout from "@/components/StudyLayout";
import StudyCard from "@/components/StudyCard";
import AssistantPanel from "@/components/AssistantPanel";
import type { useTtsControls } from "@/hooks/useTtsControls";
import type { LlmModel } from "@/lib/aiModels";
import type { FlaggedCard } from "./FlaggedCardsInner";

// eslint-disable-next-line local/no-large-component-props -- Existing wide component API; reduce before removing this override.
export default function FlaggedCardReview({
  currentCard,
  currentNote,
  hiddenIds,
  safeIndex,
  totalCards,
  tts,
  revealed,
  canPrevious,
  canNext,
  onReveal,
  onToggleFlag,
  onSetNote,
  onPrevious,
  onNext,
  initialAssistantModels,
}: {
  currentCard: FlaggedCard;
  currentNote: string | undefined;
  hiddenIds: ReadonlySet<Id<"flashcards">>;
  safeIndex: number;
  totalCards: number;
  tts: ReturnType<typeof useTtsControls>;
  revealed: boolean;
  canPrevious: boolean;
  canNext: boolean;
  onReveal: () => void;
  onToggleFlag: () => void;
  onSetNote: (note: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  initialAssistantModels?: readonly LlmModel[];
}) {
  return (
    <StudyLayout
      progress={{ current: safeIndex, total: totalCards }}
      tts={tts}
      assistant={
        <AssistantPanel
          initialModels={initialAssistantModels}
          context={{
            setId: currentCard.setId,
            cardId: currentCard.cardId,
            setName: currentCard.setName,
            cardFields: currentCard.fields,
            hasNote: Boolean(currentNote?.trim()),
          }}
        />
      }
    >
      <StudyCard
        key={currentCard.cardId}
        card={{ fields: currentCard.fields }}
        fieldDefinitions={currentCard.fieldDefinitions}
        frontFields={currentCard.frontFields}
        backFields={currentCard.backFields}
        ttsOnlyFields={currentCard.ttsOnlyFields}
        onRevealed={onReveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={{
          flagged: !hiddenIds.has(currentCard.cardId),
          note: currentNote,
        }}
        onToggleFlag={onToggleFlag}
        onSetNote={onSetNote}
      />

      {revealed && (
        <div className="flex gap-3 justify-center mt-8">
          <button
            onClick={onPrevious}
            disabled={!canPrevious}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Prev
          </button>
          <button
            onClick={onNext}
            disabled={!canNext}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </StudyLayout>
  );
}
