import type { CardRating } from "../src/lib/types";

export const SRS_DEFAULTS = {
  INITIAL_EASE_FACTOR: 2.5,
  INITIAL_INTERVAL: 0,
  INITIAL_REPETITIONS: 0,
  MAX_NEW_CARDS_PER_DAY: 20,
  MIN_EASE_FACTOR: 1.3,
  DAY_RESET_UTC_HOUR: 4,
} as const;

export type SrsCardStatus = "new" | "learning" | "review";

type SM2Input = {
  rating: CardRating;
  easeFactor: number;
  interval: number;
  repetitions: number;
};

type SM2Output = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: SrsCardStatus;
};

export function computeSM2(input: SM2Input): SM2Output {
  const { rating, easeFactor, interval, repetitions } = input;
  const minEF = SRS_DEFAULTS.MIN_EASE_FACTOR;

  switch (rating) {
    case "wrong": {
      return {
        easeFactor: Math.max(minEF, easeFactor - 0.2),
        interval: 1,
        repetitions: 0,
        status: "learning",
      };
    }
    case "hard": {
      const newReps = repetitions + 1;
      return {
        easeFactor: Math.max(minEF, easeFactor - 0.15),
        interval: Math.max(1, Math.round(interval * 1.2)),
        repetitions: newReps,
        status: newReps >= 2 ? "review" : "learning",
      };
    }
    case "good": {
      const newReps = repetitions + 1;
      let newInterval: number;
      if (newReps === 1) newInterval = 1;
      else if (newReps === 2) newInterval = 6;
      else newInterval = Math.round(interval * easeFactor);
      return {
        easeFactor,
        interval: newInterval,
        repetitions: newReps,
        status: newReps >= 2 ? "review" : "learning",
      };
    }
    case "easy": {
      const newReps = repetitions + 1;
      let newInterval: number;
      if (newReps === 1) newInterval = 1;
      else if (newReps === 2) newInterval = 6;
      else newInterval = Math.round(interval * easeFactor * 1.3);
      return {
        easeFactor: easeFactor + 0.15,
        interval: newInterval,
        repetitions: newReps,
        status: newReps >= 2 ? "review" : "learning",
      };
    }
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeNextReviewAt(interval: number, now: number): number {
  return now + interval * MS_PER_DAY;
}

export function computeDayStartMs(dayResetUtcHour: number): number {
  const now = new Date();
  now.setUTCHours(dayResetUtcHour, 0, 0, 0);
  if (now.getTime() > Date.now()) {
    now.setUTCDate(now.getUTCDate() - 1);
  }
  return now.getTime();
}

export function computeDayKey(dayResetUtcHour: number): string {
  const ms = computeDayStartMs(dayResetUtcHour);
  return new Date(ms).toISOString().slice(0, 10);
}

export function selectNewCardsRoundRobin<T>(
  perSetCards: T[][],
  limit: number
): T[] {
  const result: T[] = [];
  if (limit <= 0 || perSetCards.length === 0) return result;

  const indices = perSetCards.map(() => 0);
  let exhausted = false;
  while (!exhausted && result.length < limit) {
    exhausted = true;
    for (let s = 0; s < perSetCards.length; s++) {
      if (result.length >= limit) break;
      if (indices[s] < perSetCards[s].length) {
        result.push(perSetCards[s][indices[s]]);
        indices[s]++;
        exhausted = false;
      }
    }
  }
  return result;
}
