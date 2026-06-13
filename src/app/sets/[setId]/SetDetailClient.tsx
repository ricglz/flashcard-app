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
import SetDetailInner from "./SetDetailInner";
import type { LlmModel } from "@/lib/aiModels";

type Props = {
  setId: string;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedHasLlmKey: Preloaded<typeof api.userSettings.hasLlmKey>;
  preloadedForkSyncStatus: Preloaded<typeof api.flashcardSets.getForkSyncStatus>;
  initialAssistantModels?: readonly LlmModel[];
};

export default function SetDetailClient({
  setId,
  preloadedSet,
  initialSet,
  preloadedCards,
  preloadedTtsConfig,
  preloadedHasLlmKey,
  preloadedForkSyncStatus,
}: Props) {
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} />;
  }
  if (!cardsResult.ok) {
    return (
      <QueryErrorState
        title="Cards unavailable"
        message={getFailureMessage(cardsResult.error)}
        href="/sets"
        label="Back to sets"
      />
    );
  }

  return (
    <SetDetailInner
      setId={setId}
      setData={setResult.value}
      cards={cardsResult.value}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedHasLlmKey={preloadedHasLlmKey}
      preloadedForkSyncStatus={preloadedForkSyncStatus}
    />
  );
}
