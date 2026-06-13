"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import type { LlmModel } from "@/lib/aiModels";
import Link from "next/link";
import FlaggedCardReview from "./FlaggedCardReview";

type FlaggedCardResult = Extract<
  FunctionReturnType<typeof api.cardAnnotations.getFlagged>,
  { ok: true }
>["value"];
export type FlaggedCard = FlaggedCardResult[number];

export default function FlaggedCardsInner({
  flaggedCards: flaggedCardResult,
  preloadedTtsConfig,
  initialAssistantModels,
}: {
  flaggedCards: FlaggedCardResult;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  initialAssistantModels?: readonly LlmModel[];
}) {
  const tts = useTtsControls(preloadedTtsConfig);
  const toggleFlag = useOfflineMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useOfflineMutation(api.cardAnnotations.setNote);
  const [localNotes, setLocalNotes] = useState(
    () => new Map<Id<"flashcards">, string | undefined>(),
  );
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const navigation = useCardNavigation({
    orderedIds: flaggedCardResult.map((card) => card.cardId),
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });
  const currentCard = navigation.currentId
    ? (flaggedCardResult.find((card) => card.cardId === navigation.currentId) ?? null)
    : null;

  if (flaggedCardResult.length === 0 && navigation.hiddenIds.size === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-4 sm:px-6 py-4">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
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
          <Link href="/" className="text-sm text-muted hover:text-foreground">
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
    <FlaggedCardReview
      currentCard={currentCard}
      currentNote={currentNote}
      hiddenIds={navigation.hiddenIds}
      safeIndex={navigation.safeIndex}
      totalCards={navigation.activeIds.length}
      tts={tts}
      revealed={revealed}
      canPrevious={navigation.canPrevious}
      canNext={navigation.canNext}
      onReveal={reveal}
      onToggleFlag={handleToggleFlag}
      onSetNote={handleSetNote}
      onPrevious={navigation.goPrevious}
      onNext={navigation.goNext}
      initialAssistantModels={initialAssistantModels}
    />
  );
}
