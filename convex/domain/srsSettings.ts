import { fail, ok, type DomainFailure, type DomainResult } from "./result";

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

export function validateMaxNewCardsPerDay(
  value: number,
): DomainResult<number, InvalidMaxNewCardsPerDayFailure> {
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 200) {
    return fail({
      _tag: "InvalidMaxNewCardsPerDay",
      message: "Max new cards per day must be 0-200",
      value,
    });
  }
  return ok(rounded);
}

export function validateDayResetUtcHour(
  value: number,
): DomainResult<number, InvalidDayResetUtcHourFailure> {
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 23) {
    return fail({
      _tag: "InvalidDayResetUtcHour",
      message: "Hour must be 0-23",
      value,
    });
  }
  return ok(rounded);
}

export function validateTtsPlaybackSpeed(
  value: number,
): DomainResult<number, InvalidTtsPlaybackSpeedFailure> {
  const rounded = Math.round(value * 100) / 100;
  if (rounded < 0.25 || rounded > 2.0) {
    return fail({
      _tag: "InvalidTtsPlaybackSpeed",
      message: "Speed must be 0.25-2.0",
      value,
    });
  }
  return ok(rounded);
}

export function validateDailyGoal(
  value: number,
): DomainResult<number | undefined, InvalidDailyGoalFailure> {
  if (value < 0 || value > 500) {
    return fail({
      _tag: "InvalidDailyGoal",
      message: "Daily goal must be 0-500",
      value,
    });
  }
  return ok(value === 0 ? undefined : value);
}
