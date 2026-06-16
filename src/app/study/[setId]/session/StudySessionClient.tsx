"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import type { ActiveStudySession } from "@/lib/types";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import QueryErrorState from "@/components/QueryErrorState";
import { getFailureMessage } from "@/lib/domainResultMessage";
import StudySessionInner from "./StudySessionInner";

type Props = {
  initialSession: ActiveStudySession;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getForSet>;
};

export default function StudySessionClient({
  initialSession,
  preloadedSet,
  initialSet,
  preloadedCards,
  preloadedTtsConfig,
  preloadedAnnotations,
}: Props) {
  const flashcardSetId = initialSession.setId;
  const setId = String(flashcardSetId);
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/study/${setId}`} label="Back to study" />;
  }
  if (!cardsResult.ok) {
    return (
      <QueryErrorState
        title="Study cards unavailable"
        message={getFailureMessage(cardsResult.error)}
        href={`/study/${setId}`}
        label="Back to study"
      />
    );
  }

  return (
    <StudySessionInner
      session={initialSession}
      setData={setResult.value}
      cards={cardsResult.value}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedAnnotations={preloadedAnnotations}
    />
  );
}
