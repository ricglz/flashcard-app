"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import QueryErrorState from "@/components/QueryErrorState";
import { getFailureMessage } from "@/lib/domainResultMessage";
import type { LlmModel } from "@/lib/aiModels";
import BrowseInner from "./BrowseInner";

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
    <BrowseInner
      flashcardSetId={flashcardSetId}
      frontFields={frontFields}
      backFields={backFields}
      ttsOnlyFields={ttsOnlyFields}
      shuffle={shuffle}
      cardLimit={cardLimit}
      setData={setResult.value}
      cards={cardsResult.value}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedAnnotations={preloadedAnnotations}
      initialAssistantModels={initialAssistantModels}
    />
  );
}
