"use client";

import { useState } from "react";
import { usePreloadedQuery, useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import StudyLayout from "@/components/StudyLayout";
import StudyCard from "@/components/StudyCard";
import AssistantPanel from "@/components/AssistantPanel";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import Link from "next/link";

type Props = {
  preloaded: Preloaded<typeof api.cardAnnotations.getFlagged>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
};

type FlaggedCard = NonNullable<
  ReturnType<typeof usePreloadedQuery<typeof api.cardAnnotations.getFlagged>>[number]
>;

function isFlaggedCard(card: FlaggedCard | null): card is FlaggedCard {
  return card !== null;
}

export default function FlaggedCardsClient({
  preloaded,
  preloadedTtsConfig,
}: Props) {
  const liveQuery = usePreloadedQuery(preloaded);
  const tts = useTtsControls(preloadedTtsConfig);
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useMutation(api.cardAnnotations.setNote);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const [unflaggedIds, setUnflaggedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeCards = liveQuery
    .filter(isFlaggedCard)
    .filter((card) => !unflaggedIds.has(card.cardId));
  const safeIndex = Math.min(currentIndex, Math.max(0, activeCards.length - 1));
  const currentCard = activeCards[safeIndex];

  if (liveQuery.length === 0 && unflaggedIds.size === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-4 sm:px-6 py-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Dashboard
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <p className="text-lg font-medium mb-2">No flagged cards yet</p>
          <p className="text-muted text-sm mb-6">
            Flag cards during study by tapping the &#9733; icon on any card.
            Flagged cards appear here for focused review.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  if (activeCards.length === 0 && unflaggedIds.size > 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-4 sm:px-6 py-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Dashboard
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <p className="text-lg font-medium mb-2">
            You&apos;ve reviewed all flagged cards!
          </p>
          <p className="text-muted text-sm mb-6">
            {unflaggedIds.size} card{unflaggedIds.size !== 1 ? "s" : ""}{" "}
            unflagged
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      resetReveal();
    }
  };

  const handleNext = () => {
    if (safeIndex < activeCards.length - 1) {
      setCurrentIndex(safeIndex + 1);
      resetReveal();
    }
  };

  const handleToggleFlag = () => {
    const cardId = currentCard.cardId;
    void toggleFlag({
      cardId,
      setId: currentCard.setId,
    });
    if (!unflaggedIds.has(cardId)) {
      const newUnflagged = new Set(unflaggedIds);
      newUnflagged.add(cardId);
      setUnflaggedIds(newUnflagged);
      resetReveal();
      const newActiveLength = activeCards.length - 1;
      if (safeIndex >= newActiveLength) {
        setCurrentIndex(Math.max(0, newActiveLength - 1));
      }
    } else {
      const newUnflagged = new Set(unflaggedIds);
      newUnflagged.delete(cardId);
      setUnflaggedIds(newUnflagged);
    }
  };

  const handleSetNote = (note: string) => {
    void setNoteMutation({
      cardId: currentCard.cardId,
      setId: currentCard.setId,
      note,
    });
  };

  return (
    <StudyLayout
      progress={{ current: safeIndex, total: activeCards.length }}
      tts={tts}
      assistant={
        <AssistantPanel
          context={{
            setId: currentCard.setId,
            cardId: currentCard.cardId,
            setName: currentCard.setName,
            cardFields: currentCard.fields,
            hasNote: Boolean(currentCard.note?.trim()),
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
        onRevealed={reveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={{
          flagged: !unflaggedIds.has(currentCard.cardId),
          note: currentCard.note,
        }}
        onToggleFlag={handleToggleFlag}
        onSetNote={handleSetNote}
      />

      {revealed && (
        <div className="flex gap-3 justify-center mt-8">
          <button
            onClick={handlePrev}
            disabled={safeIndex <= 0}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Prev
          </button>
          <button
            onClick={handleNext}
            disabled={safeIndex >= activeCards.length - 1}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </StudyLayout>
  );
}
