"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../convex/_generated/api";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import QueryErrorState from "@/components/QueryErrorState";
import { getFailureMessage } from "@/lib/domainResultMessage";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import StudyConfigInner from "./StudyConfigInner";

type Props = {
  flashcardSetId: Id<"flashcardSets">;
  initialMode: "study" | "browse";
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedActiveSession: Preloaded<
    typeof api.studySessions.getActiveSession
  >;
  initialSet: FlashcardSetWithViewer;
  userSet: Doc<"userSets">;
};

export default function StudyConfigClient({
  flashcardSetId,
  initialMode,
  preloadedSet,
  preloadedCards,
  preloadedActiveSession,
  initialSet,
  userSet,
}: Props) {
  const setId = String(flashcardSetId);
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/sets/${setId}`} label="Back to set" />;
  }
  if (!cardsResult.ok) {
    return (
      <QueryErrorState
        title="Study cards unavailable"
        message={getFailureMessage(cardsResult.error)}
        href={`/sets/${setId}`}
        label="Back to set"
      />
    );
  }

  return (
    <StudyConfigInner
      flashcardSetId={flashcardSetId}
      initialMode={initialMode}
      setData={setResult.value}
      cards={cardsResult.value}
      preloadedActiveSession={preloadedActiveSession}
      userSet={userSet}
    />
  );
}
