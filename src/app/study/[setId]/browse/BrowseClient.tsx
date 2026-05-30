"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";
import StudyCard from "@/components/StudyCard";
import BrowseNavigation from "@/components/BrowseNavigation";
import AssistantPanel from "@/components/AssistantPanel";
import StudyLayout from "@/components/StudyLayout";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsForSetPreloaded } from "@/hooks/useCardAnnotations";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { shuffleArray } from "@/lib/shuffle";
import type { LlmModel } from "@/lib/aiModels";

type Props = {
  flashcardSetId: Id<"flashcardSets">;
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
  shuffle: boolean;
  cardLimit: number | null;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getForSet>;
  initialAssistantModels?: readonly LlmModel[];
};

export default function BrowseClient({
  flashcardSetId,
  frontFields,
  backFields,
  ttsOnlyFields,
  shuffle,
  cardLimit,
  preloadedSet,
  initialSet,
  preloadedCards,
  preloadedTtsConfig,
  preloadedAnnotations,
  initialAssistantModels,
}: Props) {
  const setId = String(flashcardSetId);
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);
  const cards = cardsResult.ok ? cardsResult.value : [];
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } = useCardAnnotationsForSetPreloaded(preloadedAnnotations);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const [cardOrder] = useState<Id<"flashcards">[]>(() => {
    const sorted = [...cards]
      .sort((a, b) => a.order - b.order)
      .map((c) => c._id);
    let order = shuffle ? shuffleArray(sorted) : sorted;
    if (cardLimit && cardLimit > 0 && cardLimit < order.length) {
      order = order.slice(0, cardLimit);
    }
    return order;
  });
  const navigation = useCardNavigation({
    orderedIds: cardOrder,
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/study/${setId}`} label="Back to study" />;
  }
  if (!cardsResult.ok) return null;

  const { set } = setResult.value;
  const fieldDefs = set.fieldDefinitions;
  const validFieldNames = new Set(fieldDefs.map((fd) => fd.name));
  const validFrontFields = frontFields.filter((f) => validFieldNames.has(f));
  const validBackFields = backFields.filter((f) => validFieldNames.has(f));
  const validTtsOnlyFields = ttsOnlyFields.filter((f) => validFieldNames.has(f));
  const cardsMap = new Map(cards.map((c) => [c._id, c]));

  if (navigation.activeIds.length === 0) {
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
            {navigation.hiddenIds.size > 0
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

  const safeIndex = navigation.safeIndex;
  const currentCardId = navigation.currentId;
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Card not found.</p>
      </div>
    );
  }

  const currentAnnotation = annotationMap.get(currentCard._id);

  return (
    <StudyLayout
      progress={{ current: safeIndex, total: navigation.activeIds.length, dismissed: navigation.hiddenIds.size }}
      tts={tts}
      assistant={
        <AssistantPanel
          initialModels={initialAssistantModels}
          context={{
            setId: flashcardSetId,
            cardId: currentCard._id,
            setName: set.name,
            cardFields: currentCard.fields,
            hasNote: Boolean(currentAnnotation?.note?.trim()),
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
        onRevealed={reveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={currentAnnotation}
        onToggleFlag={() => {
          if (currentCardId) void toggleFlag({ cardId: currentCardId, setId: flashcardSetId });
        }}
        onSetNote={(note: string) => {
          if (currentCardId) void setNote({ cardId: currentCardId, setId: flashcardSetId, note });
        }}
      />

      {revealed && (
        <BrowseNavigation
          onPrev={navigation.goPrevious}
          onNext={navigation.goNext}
          onDismiss={navigation.hideCurrent}
          canPrev={navigation.canPrevious}
          canNext={navigation.canNext}
        />
      )}
    </StudyLayout>
  );
}
