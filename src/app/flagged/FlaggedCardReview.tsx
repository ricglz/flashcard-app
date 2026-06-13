"use client";

import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import StudyLayout from "@/components/StudyLayout";
import StudyCard from "@/components/StudyCard";
import AssistantPanel from "@/components/AssistantPanel";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import type { useTtsControls } from "@/hooks/useTtsControls";
import type { LlmModel } from "@/lib/aiModels";
import type { FlaggedCard } from "./FlaggedCardsInner";

type FlaggedReviewState = {
  revealed: boolean;
  onReveal: () => void;
};

type FlaggedReviewNavigation = {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onHideCurrent: () => void;
};

type FlaggedCardReviewProps = {
  currentCard: FlaggedCard;
  tts: ReturnType<typeof useTtsControls>;
  progress: { current: number; total: number };
  review: FlaggedReviewState;
  navigation: FlaggedReviewNavigation;
  initialAssistantModels?: readonly LlmModel[];
};

export default function FlaggedCardReview({
  currentCard,
  tts,
  progress,
  review,
  navigation,
  initialAssistantModels,
}: FlaggedCardReviewProps) {
  const toggleFlag = useOfflineMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useOfflineMutation(api.cardAnnotations.setNote);
  const [localNotes, setLocalNotes] = useState(
    () => new Map<Id<"flashcards">, string | undefined>(),
  );
  const currentNote = localNotes.has(currentCard.cardId)
    ? localNotes.get(currentCard.cardId)
    : currentCard.note;

  const handleToggleFlag = () => {
    void toggleFlag({
      cardId: currentCard.cardId,
      setId: currentCard.setId,
    });
    navigation.onHideCurrent();
  };

  const handleSetNote = (note: string) => {
    const trimmed = note.trim();
    setLocalNotes((previous) => {
      const next = new Map(previous);
      next.set(currentCard.cardId, trimmed || undefined);
      return next;
    });
    void setNoteMutation({
      cardId: currentCard.cardId,
      setId: currentCard.setId,
      note,
    });
  };

  return (
    <StudyLayout
      progress={progress}
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
        onRevealed={review.onReveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={{ flagged: true, note: currentNote }}
        onToggleFlag={handleToggleFlag}
        onSetNote={handleSetNote}
      />

      {review.revealed ? (
        <div className="flex gap-3 justify-center mt-8">
          <button
            onClick={navigation.onPrevious}
            disabled={!navigation.canPrevious}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Prev
          </button>
          <button
            onClick={navigation.onNext}
            disabled={!navigation.canNext}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      ) : null}
    </StudyLayout>
  );
}
