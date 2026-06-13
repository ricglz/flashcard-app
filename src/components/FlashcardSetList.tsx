"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { getFailureMessage } from "@/lib/domainResultMessage";
import { Alert } from "@/components/ui/Alert";
import FlashcardSetListInner from "./FlashcardSetListInner";

export default function FlashcardSetList({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.flashcardSets.list>;
}) {
  const setsResult = useOfflinePreloadedQuery(preloaded);
  if (!setsResult.ok) {
    return (
      <Alert variant="danger">
        Could not load flashcard sets: {getFailureMessage(setsResult.error)}
      </Alert>
    );
  }
  return <FlashcardSetListInner sets={setsResult.value} />;
}
