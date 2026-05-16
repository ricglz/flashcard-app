"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import type {
  CardRating,
  TypedCardResult} from "@/lib/types";
import {
  CARD_RATING_LABELS,
  CARD_RATING_SCORES,
  CARD_RATINGS
} from "@/lib/types";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";

type Props = {
  setId: string;
  preloadedResults: Preloaded<typeof api.studySessions.getResults>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
};

export default function ResultsClient({
  setId,
  preloadedResults,
  preloadedCards,
  preloadedSet,
}: Props) {
  const data = usePreloadedQuery(preloadedResults);
  const cards = usePreloadedQuery(preloadedCards);
  const { set } = useTypedFlashcardSet(preloadedSet);

  if (!data) return null;

  const { session } = data;
  const results = data.results as TypedCardResult[];
  const cardsMap = new Map(cards.map((c) => [c._id, c]));

  // Count ratings
  const ratingCounts: Record<CardRating, number> = {
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };
  for (const r of results) {
    const rating = r.rating;
    ratingCounts[rating] = ratingCounts[rating] + 1;
  }

  const totalCards = session.cardOrder.length;
  const completedCards = results.length;
  const scorePercent = session.overallScore
    ? Math.round(session.overallScore * 100)
    : Math.round(
        (results.reduce(
          (sum, r) =>
            sum +
            CARD_RATING_SCORES[r.rating],
          0
        ) /
          (completedCards * 3 || 1)) *
          100
      );

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

        {/* Score circle */}
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-accent flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold">{scorePercent}%</p>
              <p className="text-xs text-muted">Score</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-raised rounded-lg text-center">
            <p className="text-2xl font-bold">{completedCards}</p>
            <p className="text-xs text-muted">
              of {totalCards} cards
            </p>
          </div>
          {duration !== null && (
            <div className="p-3 bg-raised rounded-lg text-center">
              <p className="text-2xl font-bold">
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
              </p>
              <p className="text-xs text-muted">Duration</p>
            </div>
          )}
        </div>

        {/* Rating breakdown */}
        <div className="space-y-2">
          <h2 className="font-semibold">Breakdown</h2>
          {CARD_RATINGS.map((rating) => {
            const count = ratingCounts[rating];
            return (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-16">
                {CARD_RATING_LABELS[rating]}
              </span>
              <div className="flex-1 bg-raised rounded-full h-4">
                <div
                  className={`h-full rounded-full ${
                    rating === "wrong"
                      ? "bg-red-500"
                      : rating === "hard"
                        ? "bg-orange-400"
                        : rating === "good"
                          ? "bg-blue-500"
                          : "bg-green-500"
                  }`}
                  style={{
                    width: `${completedCards > 0 ? (count / completedCards) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted w-8 text-right">
                {count}
              </span>
            </div>
            );
          })}
        </div>

        {/* Per-card results */}
        {results.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Card Details</h2>
            <div className="space-y-1">
              {results.map((r, i) => {
                const card = cardsMap.get(r.cardId);
                const firstFieldValue = card
                  ? Object.values(card.fields)[0]
                  : "?";
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 text-sm border border-edge rounded-lg"
                  >
                    <span className="truncate flex-1">
                      {firstFieldValue}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.rating === "wrong"
                          ? "bg-rating-wrong-bg text-rating-wrong-text"
                          : r.rating === "hard"
                            ? "bg-rating-hard-bg text-rating-hard-text"
                            : r.rating === "good"
                              ? "bg-rating-good-bg text-rating-good-text"
                              : "bg-rating-easy-bg text-rating-easy-text"
                      }`}
                    >
                      {CARD_RATING_LABELS[r.rating]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
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
