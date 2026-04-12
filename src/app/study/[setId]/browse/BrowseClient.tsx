"use client";

import { useState, useMemo } from "react";
import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import StudyCard from "@/components/StudyCard";
import BrowseNavigation from "@/components/BrowseNavigation";
import { FieldDefinition } from "@/lib/types";

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type Props = {
  setId: string;
  frontFields: string[];
  backFields: string[];
  shuffle: boolean;
  cardLimit: number | null;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
};

export default function BrowseClient({
  setId,
  frontFields,
  backFields,
  shuffle,
  cardLimit,
  preloadedSet,
  preloadedCards,
}: Props) {
  const set = usePreloadedQuery(preloadedSet)!;
  const cards = usePreloadedQuery(preloadedCards);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<Id<"flashcards">>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Compute card order once when cards first load, then filter dismissed
  const [cardOrder, setCardOrder] = useState<Id<"flashcards">[] | null>(null);

  if (cards && cardOrder === null) {
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

  const fieldDefs = set.fieldDefinitions as FieldDefinition[];
  const validFieldNames = new Set(fieldDefs.map((fd) => fd.name));
  const validFrontFields = frontFields.filter((f) => validFieldNames.has(f));
  const validBackFields = backFields.filter((f) => validFieldNames.has(f));
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

  // Clamp index to valid range
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
    setDismissed(new Set([...dismissed, currentCardId]));
    setRevealed(false);
    if (safeIndex >= activeCardIds.length - 2) {
      setCurrentIndex(Math.max(0, safeIndex - 1));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link
          href={`/study/${setId}?mode=browse`}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {safeIndex + 1} / {activeCardIds.length}
            {dismissed.size > 0 && (
              <span className="ml-2">({dismissed.size} dismissed)</span>
            )}
          </span>
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            {ttsEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${((safeIndex + 1) / activeCardIds.length) * 100}%`,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <StudyCard
          key={currentCardId}
          card={currentCard}
          fieldDefinitions={fieldDefs}
          frontFields={validFrontFields}
          backFields={validBackFields}
          onRevealed={() => setRevealed(true)}
          autoPlayTts={ttsEnabled}
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
      </main>
    </div>
  );
}
