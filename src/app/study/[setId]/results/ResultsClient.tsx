"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { computeScorePercent } from "@/lib/studyResults";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import StudyResultsSummary from "@/components/StudyResultsSummary";

type Props = {
  setId: string;
  preloadedResults: Preloaded<typeof api.studySessions.getResults>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
};

export default function ResultsClient({
  setId,
  preloadedResults,
  preloadedCards,
  preloadedSet,
  initialSet,
}: Props) {
  const data = usePreloadedQuery(preloadedResults);
  const cardsResult = usePreloadedQuery(preloadedCards);
  const cards = cardsResult.ok ? cardsResult.value : [];
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/study/${setId}`} label="Back to study" />;
  }
  if (!cardsResult.ok) return null;
  if (!data) return null;

  const { set } = setResult.value;
  const { session } = data;
  const results = data.results;
  const totalCards = session.cardOrder.length;
  const completedCards = results.length;
  const scorePercent = computeScorePercent(results, session.overallScore);

  const duration = session.completedAt
    ? Math.round((session.completedAt - session.startedAt) / 1000)
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Home
        </Link>
      </header>

      <main className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Session Results</h1>
        <p className="text-sm text-muted">{set.name}</p>

        <StudyResultsSummary
          results={results}
          cards={cards}
          scorePercent={scorePercent}
          completedCards={completedCards}
          totalCards={totalCards}
          durationSeconds={duration}
        />

        <div className="flex gap-3">
          <Link
            href={`/study/${setId}`}
            className="flex-1 py-3 text-center bg-accent text-white rounded-lg hover:bg-accent-hover font-medium transition-colors"
          >
            Study Again
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 text-center border border-edge rounded-lg hover:bg-surface-hover font-medium transition-colors"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
