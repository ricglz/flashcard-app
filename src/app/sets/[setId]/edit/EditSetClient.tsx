"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import QueryErrorState from "@/components/QueryErrorState";
import { getFailureMessage } from "@/lib/domainResultMessage";
import EditSetInner from "./EditSetInner";

type Props = {
  setId: string;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
};

export default function EditSetClient({
  setId,
  preloadedSet,
  initialSet,
  preloadedCards,
}: Props) {
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/sets/${setId}`} label="Back to set" />;
  }
  if (!cardsResult.ok) {
    return (
      <QueryErrorState
        title="Cards unavailable"
        message={getFailureMessage(cardsResult.error)}
        href={`/sets/${setId}`}
        label="Back to set"
      />
    );
  }

  return <EditSetInner setId={setId} setData={setResult.value} cards={cardsResult.value} />;
}
