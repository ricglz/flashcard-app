"use client";

import { useState, useMemo } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import Link from "next/link";
import { Id } from "../../../../../convex/_generated/dataModel";
import { asId } from "@/lib/convexHelpers";
import StudyCard from "@/components/StudyCard";
import BrowseNavigation from "@/components/BrowseNavigation";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";
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
  const settings = useOfflineQuery(api.userSettings.get);
  const updateSettings = useMutation(api.userSettings.updateTtsPlaybackSpeed);
  const annotations = useOfflineQuery(api.cardAnnotations.getForSet, { setId: asId<"flashcardSets">(setId) });
  const toggleFlagMutation = useMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useMutation(api.cardAnnotations.setNote);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<Id<"flashcards">>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);

  const effectiveTtsSpeed = localTtsSpeed ?? settings?.ttsPlaybackSpeed ?? 0.75;

  const annotationMap = new Map(
    (annotations ?? []).map((a) => [a.cardId, { flagged: a.flagged, note: a.note }])
  );

  const handleTtsSpeedChange = (speed: number) => {
    setLocalTtsSpeed(speed);
    void updateSettings({ ttsPlaybackSpeed: speed });
  };

  // Compute card order once when cards first load, then filter dismissed
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

  const handleNext = () => {    if (safeIndex < activeCardIds.length - 1) {
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
          <TtsSpeedControl speed={effectiveTtsSpeed} onSpeedChange={handleTtsSpeedChange} />
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
            aria-label={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            <SpeakerIcon muted={!ttsEnabled} />
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
          ttsOnlyFields={validTtsOnlyFields}
          onRevealed={() => setRevealed(true)}
          autoPlayTts={ttsEnabled}
          ttsRate={effectiveTtsSpeed}
          annotation={currentCardId ? annotationMap.get(currentCardId) : undefined}
          onToggleFlag={() => {
            if (currentCardId) void toggleFlagMutation({ cardId: currentCardId, setId: asId<"flashcardSets">(setId) });
          }}
          onSetNote={(note: string) => {
            if (currentCardId) void setNoteMutation({ cardId: currentCardId, setId: asId<"flashcardSets">(setId), note });
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
      </main>
    </div>
  );
}
