"use client";

import { useState, useMemo } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { asId } from "@/lib/convexHelpers";
import StudyCard from "@/components/StudyCard";
import BrowseNavigation from "@/components/BrowseNavigation";
import AssistantPanel from "@/components/AssistantPanel";
import StudyLayout from "@/components/StudyLayout";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotations } from "@/hooks/useCardAnnotations";
import { shuffleArray } from "@/lib/shuffle";

type Props = {
  setId: string;
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
  shuffle: boolean;
  cardLimit: number | null;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
};

export default function BrowseClient({
  setId,
  frontFields,
  backFields,
  ttsOnlyFields,
  shuffle,
  cardLimit,
  preloadedSet,
  preloadedCards,
}: Props) {
  const { set } = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const tts = useTtsControls();
  const { annotationMap, toggleFlag, setNote } = useCardAnnotations(asId<"flashcardSets">(setId));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<Id<"flashcards">>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const [cardOrder, setCardOrder] = useState<Id<"flashcards">[] | null>(null);

  if (cardOrder === null) {
    const sorted = [...cards]
      .sort((a, b) => a.order - b.order)
      .map((c) => c._id);
    let order = shuffle ? shuffleArray(sorted) : sorted;
    if (cardLimit && cardLimit > 0 && cardLimit < order.length) {
      order = order.slice(0, cardLimit);
    }
    setCardOrder(order);
  }

  const activeCardIds = useMemo(() => {
    if (!cardOrder) return [];
    return cardOrder.filter((id) => !dismissed.has(id));
  }, [cardOrder, dismissed]);

  const fieldDefs = set.fieldDefinitions;
  const validFieldNames = new Set(fieldDefs.map((fd) => fd.name));
  const validFrontFields = frontFields.filter((f) => validFieldNames.has(f));
  const validBackFields = backFields.filter((f) => validFieldNames.has(f));
  const validTtsOnlyFields = ttsOnlyFields.filter((f) => validFieldNames.has(f));
  const cardsMap = new Map(cards.map((c) => [c._id, c]));

  if (activeCardIds.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-4 sm:px-6 py-4">
          <Link
            href={`/study/${setId}?mode=browse`}
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Back
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          <p className="text-lg font-medium mb-4">
            {dismissed.size > 0
              ? "You've reviewed all the cards!"
              : "No cards to browse."}
          </p>
          <Link
            href={`/study/${setId}?mode=browse`}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Back to Study Config
          </Link>
        </main>
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, activeCardIds.length - 1);
  const currentCardId = activeCardIds[safeIndex];
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Card not found.</p>
      </div>
    );
  }

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      setRevealed(false);
    }
  };

  const handleNext = () => {
    if (safeIndex < activeCardIds.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setRevealed(false);
    }
  };

  const handleDismiss = () => {
    if (!currentCardId) return;
    setDismissed(new Set([...dismissed, currentCardId]));
    setRevealed(false);
    if (safeIndex >= activeCardIds.length - 2) {
      setCurrentIndex(Math.max(0, safeIndex - 1));
    }
  };

  return (
    <StudyLayout
      progress={{ current: safeIndex, total: activeCardIds.length, dismissed: dismissed.size }}
      tts={tts}
      assistant={
        <AssistantPanel
          context={{
            setId: asId<"flashcardSets">(setId),
            setName: set.name,
            cardFields: currentCard.fields,
          }}
        />
      }
    >
      <StudyCard
        key={currentCardId}
        card={currentCard}
        fieldDefinitions={fieldDefs}
        frontFields={validFrontFields}
        backFields={validBackFields}
        ttsOnlyFields={validTtsOnlyFields}
        onRevealed={() => setRevealed(true)}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={currentCardId ? annotationMap.get(currentCardId) : undefined}
        onToggleFlag={() => {
          if (currentCardId) void toggleFlag({ cardId: currentCardId, setId: asId<"flashcardSets">(setId) });
        }}
        onSetNote={(note: string) => {
          if (currentCardId) void setNote({ cardId: currentCardId, setId: asId<"flashcardSets">(setId), note });
        }}
      />

      {revealed && (
        <BrowseNavigation
          onPrev={handlePrev}
          onNext={handleNext}
          onDismiss={handleDismiss}
          canPrev={safeIndex > 0}
          canNext={safeIndex < activeCardIds.length - 1}
        />
      )}
    </StudyLayout>
  );
}
