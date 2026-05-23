"use client";

import type { ReactNode } from "react";
import { CARD_RATING_LABELS, CARD_RATINGS, type CardRating } from "@/lib/types";
import {
  countRatings,
  ratingBadgeClassName,
  ratingBarClassName,
  ratingPercentage,
} from "@/lib/studyResults";

type Result = {
  cardId: string;
  rating: CardRating;
};

type ResultCard = {
  _id: string;
  fields: Record<string, string>;
};

export default function StudyResultsSummary({
  results,
  cards,
  scorePercent,
  scoreLabel = "Score",
  completedCards,
  totalCards,
  durationSeconds,
  breakdownTitle = "Breakdown",
  detailsTitle = "Card Details",
  syncMessage,
}: {
  results: Result[];
  cards: ResultCard[];
  scorePercent: number;
  scoreLabel?: string;
  completedCards: number;
  totalCards: number;
  durationSeconds?: number | null;
  breakdownTitle?: string;
  detailsTitle?: string;
  syncMessage?: ReactNode;
}) {
  const cardsMap = new Map(cards.map((card) => [card._id, card]));
  const ratingCounts = countRatings(results);

  return (
    <>
      {syncMessage}

      <div className="flex justify-center">
        <div className="w-32 h-32 rounded-full border-4 border-accent flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold">{scorePercent}%</p>
            <p className="text-xs text-muted">{scoreLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-raised rounded-lg text-center">
          <p className="text-2xl font-bold">{completedCards}</p>
          <p className="text-xs text-muted">of {totalCards} cards</p>
        </div>
        {durationSeconds !== undefined && durationSeconds !== null && (
          <div className="p-3 bg-raised rounded-lg text-center">
            <p className="text-2xl font-bold">
              {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, "0")}
            </p>
            <p className="text-xs text-muted">Duration</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">{breakdownTitle}</h2>
        {CARD_RATINGS.map((rating) => {
          const count = ratingCounts[rating];
          return (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-16">{CARD_RATING_LABELS[rating]}</span>
              <div className="flex-1 bg-raised rounded-full h-4">
                <div
                  className={`h-full rounded-full ${ratingBarClassName(rating)}`}
                  style={{
                    width: `${ratingPercentage(count, results.length)}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {results.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">{detailsTitle}</h2>
          <div className="space-y-1">
            {results.map((result, index) => {
              const card = cardsMap.get(result.cardId);
              const firstFieldValue = card ? Object.values(card.fields)[0] : "?";
              return (
                <div
                  key={`${result.cardId}-${index}`}
                  className="flex items-center justify-between p-2 text-sm border border-edge rounded-lg"
                >
                  <span className="truncate flex-1">{firstFieldValue}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${ratingBadgeClassName(result.rating)}`}
                  >
                    {CARD_RATING_LABELS[result.rating]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
