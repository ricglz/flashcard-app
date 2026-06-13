"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";
import type { CardRating } from "@/lib/types";
import { computeScorePercent } from "@/lib/studyResults";
import StudyResultsSummary from "@/components/StudyResultsSummary";
import Link from "next/link";

export type LocalStudyResult = {
  cardId: Id<"flashcards">;
  rating: CardRating;
};

type LocalResultCard = {
  _id: Id<"flashcards">;
  fields: Record<string, string>;
};

export default function StudySessionLocalResults({
  setId,
  setName,
  results,
  cards,
  completedCards,
  totalCards,
}: {
  setId: string;
  setName: string;
  results: LocalStudyResult[];
  cards: LocalResultCard[];
  completedCards: number;
  totalCards: number;
}) {
  const scorePercent = computeScorePercent(results);

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Home
        </Link>
      </header>

      <main className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Session Results</h1>
          <p className="text-sm text-muted">{setName}</p>
        </div>

        <StudyResultsSummary
          results={results}
          cards={cards}
          scorePercent={scorePercent}
          completedCards={completedCards}
          totalCards={totalCards}
          variant="localSyncing"
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
