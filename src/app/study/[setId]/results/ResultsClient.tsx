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
import ResultsInner from "./ResultsInner";

type Props = {
  setId: string;
  preloadedResults: Preloaded<typeof api.studySessions.getResults>;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
};

export default function ResultsClient({
  setId,
  preloadedResults,
  preloadedSet,
  initialSet,
}: Props) {
  const data = usePreloadedQuery(preloadedResults);
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/study/${setId}`} label="Back to study" />;
  }
  if (!data.ok) {
    return (
      <QueryErrorState
        title="Results unavailable"
        message={getFailureMessage(data.error)}
        href={`/study/${setId}`}
        label="Back to study"
      />
    );
  }

  return <ResultsInner setId={setId} setData={setResult.value} data={data.value} />;
}
