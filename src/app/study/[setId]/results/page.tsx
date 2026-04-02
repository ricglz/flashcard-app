"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CARD_RATING_LABELS,
  CARD_RATING_SCORES,
  CardRating,
} from "@/lib/types";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get(
    "sessionId"
  ) as Id<"studySessions"> | null;

  const data = useQuery(
    api.studySessions.getResults,
    sessionId ? { sessionId } : "skip"
  );
  const cards = useQuery(api.flashcards.list, {
    setId: setId as Id<"flashcardSets">,
  });
  const set = useQuery(api.flashcardSets.get, {
    id: setId as Id<"flashcardSets">,
  });

  if (data === undefined || cards === undefined || set === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || !set) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Results not found.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  const { session, results } = data;
  const cardsMap = new Map(cards.map((c) => [c._id, c]));

  // Count ratings
  const ratingCounts: Record<string, number> = {
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };
  for (const r of results) {
    ratingCounts[r.rating] = (ratingCounts[r.rating] ?? 0) + 1;
  }

  const totalCards = session.cardOrder.length;
  const completedCards = results.length;
  const scorePercent = session.overallScore
    ? Math.round(session.overallScore * 100)
    : Math.round(
        (results.reduce(
          (sum, r) =>
            sum +
            CARD_RATING_SCORES[r.rating as CardRating],
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
      <header className="border-b px-6 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Home
        </Link>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Session Results</h1>
        <p className="text-sm text-gray-500">{set.name}</p>

        {/* Score circle */}
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-blue-200 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold">{scorePercent}%</p>
              <p className="text-xs text-gray-400">Score</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold">{completedCards}</p>
            <p className="text-xs text-gray-500">
              of {totalCards} cards
            </p>
          </div>
          {duration !== null && (
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
              </p>
              <p className="text-xs text-gray-500">Duration</p>
            </div>
          )}
        </div>

        {/* Rating breakdown */}
        <div className="space-y-2">
          <h2 className="font-semibold">Breakdown</h2>
          {(
            Object.entries(ratingCounts) as [CardRating, number][]
          ).map(([rating, count]) => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-16">
                {CARD_RATING_LABELS[rating]}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-4">
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
              <span className="text-sm text-gray-500 w-8 text-right">
                {count}
              </span>
            </div>
          ))}
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
                    className="flex items-center justify-between p-2 text-sm border rounded"
                  >
                    <span className="truncate flex-1">
                      {firstFieldValue}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.rating === "wrong"
                          ? "bg-red-100 text-red-700"
                          : r.rating === "hard"
                            ? "bg-orange-100 text-orange-700"
                            : r.rating === "good"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {CARD_RATING_LABELS[r.rating as CardRating]}
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
            className="flex-1 py-3 text-center bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Study Again
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 text-center border rounded-lg hover:bg-gray-50 font-medium"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
