import type { CardRating } from "./types";
import { CARD_RATING_SCORES } from "./types";

const MAX_RATING_SCORE = 3;

export type RatedResult = {
  rating: CardRating;
};

export type RatingCounts = Record<CardRating, number>;

export function createEmptyRatingCounts(): RatingCounts {
  return {
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };
}

export function countRatings(results: ReadonlyArray<RatedResult>): RatingCounts {
  const counts = createEmptyRatingCounts();
  for (const result of results) {
    counts[result.rating] += 1;
  }
  return counts;
}

export function computeOverallScore(
  results: ReadonlyArray<RatedResult>,
): number {
  if (results.length === 0) return 0;
  const total = results.reduce(
    (sum, result) => sum + CARD_RATING_SCORES[result.rating],
    0,
  );
  return total / (results.length * MAX_RATING_SCORE);
}

export function computeScorePercent(
  results: ReadonlyArray<RatedResult>,
  persistedScore?: number | null,
): number {
  if (persistedScore !== undefined && persistedScore !== null) {
    return Math.round(persistedScore * 100);
  }
  return Math.round(computeOverallScore(results) * 100);
}

export function ratingPercentage(
  count: number,
  total: number,
): number {
  return total > 0 ? (count / total) * 100 : 0;
}

export function ratingBarClassName(rating: CardRating): string {
  switch (rating) {
    case "wrong":
      return "bg-red-500";
    case "hard":
      return "bg-orange-400";
    case "good":
      return "bg-blue-500";
    case "easy":
      return "bg-green-500";
  }
}

export function ratingBadgeClassName(rating: CardRating): string {
  switch (rating) {
    case "wrong":
      return "bg-rating-wrong-bg text-rating-wrong-text";
    case "hard":
      return "bg-rating-hard-bg text-rating-hard-text";
    case "good":
      return "bg-rating-good-bg text-rating-good-text";
    case "easy":
      return "bg-rating-easy-bg text-rating-easy-text";
  }
}
