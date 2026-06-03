"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import StudyLayout from "@/components/StudyLayout";
import StudyCard from "@/components/StudyCard";
import AssistantPanel from "@/components/AssistantPanel";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import type { LlmModel } from "@/lib/aiModels";
import Link from "next/link";

type Props = {
  preloaded: Preloaded<typeof api.cardAnnotations.getFlagged>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  initialAssistantModels?: readonly LlmModel[];
};

type FlaggedCard = NonNullable<
  FunctionReturnType<typeof api.cardAnnotations.getFlagged>[number]
>;

function isFlaggedCard(card: FlaggedCard | null): card is FlaggedCard {
  return card !== null;
}

export default function FlaggedCardsClient({
  preloaded,
  preloadedTtsConfig,
  initialAssistantModels,
}: Props) {
  const liveQuery = useOfflinePreloadedQuery(preloaded);
  const tts = useTtsControls(preloadedTtsConfig);
  const toggleFlag = useOfflineMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useOfflineMutation(api.cardAnnotations.setNote);
  const [localNotes, setLocalNotes] = useState(
    () => new Map<Id<"flashcards">, string | undefined>(),
  );
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const flaggedCards = liveQuery.filter(isFlaggedCard);
  const navigation = useCardNavigation({
    orderedIds: flaggedCards.map((card) => card.cardId),
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });
  const currentCard = navigation.currentId
    ? (flaggedCards.find((card) => card.cardId === navigation.currentId) ?? null)
    : null;

  if (liveQuery.length === 0 && navigation.hiddenIds.size === 0) {
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

  if (navigation.activeIds.length === 0 && navigation.hiddenIds.size > 0) {
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
            {navigation.hiddenIds.size} card{navigation.hiddenIds.size !== 1 ? "s" : ""}{" "}
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

  const handleToggleFlag = () => {
    const cardId = currentCard.cardId;
    void toggleFlag({
      cardId,
      setId: currentCard.setId,
    });
    navigation.hideCurrent();
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
  const currentNote = localNotes.has(currentCard.cardId)
    ? localNotes.get(currentCard.cardId)
    : currentCard.note;

  return (
    <StudyLayout
      progress={{ current: navigation.safeIndex, total: navigation.activeIds.length }}
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
        onRevealed={reveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={{
          flagged: !navigation.hiddenIds.has(currentCard.cardId),
          note: currentNote,
        }}
        onToggleFlag={handleToggleFlag}
        onSetNote={handleSetNote}
      />

      {revealed && (
        <div className="flex gap-3 justify-center mt-8">
          <button
            onClick={navigation.goPrevious}
            disabled={!navigation.canPrevious}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Prev
          </button>
          <button
            onClick={navigation.goNext}
            disabled={!navigation.canNext}
            className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </StudyLayout>
  );
}
