"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { computeScorePercent } from "@/lib/studyResults";
import type { TypedSetWithViewer } from "@/hooks/convex/useTypedFlashcardSet";
import StudyResultsSummary from "@/components/StudyResultsSummary";

type ResultsData = Extract<
  FunctionReturnType<typeof api.studySessions.getResults>,
  { ok: true }
>["value"];

export default function ResultsInner({
  setId,
  setData,
  data,
}: {
  setId: string;
  setData: TypedSetWithViewer;
  data: ResultsData;
}) {
  const { set } = setData;
  const { session, cards, results } = data;
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
