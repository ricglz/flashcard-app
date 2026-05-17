import * as Effect from "effect/Effect";
import { toDomainResult } from "./effect";
import type { DomainFailure, DomainResult } from "./result";

export type InvalidMaxNewCardsPerDayFailure = DomainFailure<
  "InvalidMaxNewCardsPerDay",
  { value: number }
>;
export type InvalidDayResetUtcHourFailure = DomainFailure<
  "InvalidDayResetUtcHour",
  { value: number }
>;
export type InvalidTtsPlaybackSpeedFailure = DomainFailure<
  "InvalidTtsPlaybackSpeed",
  { value: number }
>;
export type InvalidDailyGoalFailure = DomainFailure<"InvalidDailyGoal", { value: number }>;

export type SrsSettingsFailure =
  | InvalidMaxNewCardsPerDayFailure
  | InvalidDayResetUtcHourFailure
  | InvalidTtsPlaybackSpeedFailure
  | InvalidDailyGoalFailure;

export function validateMaxNewCardsPerDayEffect(
  value: number,
): Effect.Effect<number, InvalidMaxNewCardsPerDayFailure> {
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 200) {
    return Effect.fail({
      _tag: "InvalidMaxNewCardsPerDay",
      message: "Max new cards per day must be 0-200",
      value,
    });
  }
  return Effect.succeed(rounded);
}

export function validateMaxNewCardsPerDay(
  value: number,
): DomainResult<number, InvalidMaxNewCardsPerDayFailure> {
  return toDomainResult(validateMaxNewCardsPerDayEffect(value));
}

export function validateDayResetUtcHourEffect(
  value: number,
): Effect.Effect<number, InvalidDayResetUtcHourFailure> {
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 23) {
    return Effect.fail({
      _tag: "InvalidDayResetUtcHour",
      message: "Hour must be 0-23",
      value,
    });
  }
  return Effect.succeed(rounded);
}

export function validateDayResetUtcHour(
  value: number,
): DomainResult<number, InvalidDayResetUtcHourFailure> {
  return toDomainResult(validateDayResetUtcHourEffect(value));
}

export function validateTtsPlaybackSpeedEffect(
  value: number,
): Effect.Effect<number, InvalidTtsPlaybackSpeedFailure> {
  const rounded = Math.round(value * 100) / 100;
  if (rounded < 0.25 || rounded > 2.0) {
    return Effect.fail({
      _tag: "InvalidTtsPlaybackSpeed",
      message: "Speed must be 0.25-2.0",
      value,
    });
  }
  return Effect.succeed(rounded);
}

export function validateTtsPlaybackSpeed(
  value: number,
): DomainResult<number, InvalidTtsPlaybackSpeedFailure> {
  return toDomainResult(validateTtsPlaybackSpeedEffect(value));
}

export function validateDailyGoalEffect(
  value: number,
): Effect.Effect<number | undefined, InvalidDailyGoalFailure> {
  if (value < 0 || value > 500) {
    return Effect.fail({
      _tag: "InvalidDailyGoal",
      message: "Daily goal must be 0-500",
      value,
    });
  }
  return Effect.succeed(value === 0 ? undefined : value);
}

export function validateDailyGoal(
  value: number,
): DomainResult<number | undefined, InvalidDailyGoalFailure> {
  return toDomainResult(validateDailyGoalEffect(value));
}
