"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";
import type { CardRating } from "@/lib/types";
import {
  CARD_RATING_LABELS,
  CARD_RATING_SCORES,
  CARD_RATINGS,
} from "@/lib/types";
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
  const cardsMap = new Map(cards.map((card) => [card._id, card]));
  const ratingCounts: Record<CardRating, number> = {
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };

  for (const result of results) {
    ratingCounts[result.rating] = ratingCounts[result.rating] + 1;
  }

  const scorePercent =
    results.length > 0
      ? Math.round(
          (results.reduce(
            (sum, result) => sum + CARD_RATING_SCORES[result.rating],
            0,
          ) /
            (results.length * 3)) *
            100,
        )
      : 0;

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
          <p className="mt-2 text-sm text-muted">
            Results are syncing in the background.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-accent flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold">{scorePercent}%</p>
              <p className="text-xs text-muted">Local score</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-raised rounded-lg text-center">
          <p className="text-2xl font-bold">{completedCards}</p>
          <p className="text-xs text-muted">of {totalCards} cards</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Recent Breakdown</h2>
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
                      width: `${results.length > 0 ? (count / results.length) * 100 : 0}%`,
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

        {results.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Recent Cards</h2>
            <div className="space-y-1">
              {results.map((result) => {
                const card = cardsMap.get(result.cardId);
                const firstFieldValue = card
                  ? Object.values(card.fields)[0]
                  : "?";
                return (
                  <div
                    key={result.cardId}
                    className="flex items-center justify-between p-2 text-sm border border-edge rounded-lg"
                  >
                    <span className="truncate flex-1">{firstFieldValue}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        result.rating === "wrong"
                          ? "bg-rating-wrong-bg text-rating-wrong-text"
                          : result.rating === "hard"
                            ? "bg-rating-hard-bg text-rating-hard-text"
                            : result.rating === "good"
                              ? "bg-rating-good-bg text-rating-good-text"
                              : "bg-rating-easy-bg text-rating-easy-text"
                      }`}
                    >
                      {CARD_RATING_LABELS[result.rating]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
