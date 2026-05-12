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

export type UserSettingsPatch = {
  maxNewCardsPerDay?: number;
  dayResetUtcHour?: number;
  ttsPlaybackSpeed?: number;
  dailyGoal?: number | undefined;
};

export function validateUserSettingsPatch(input: {
  maxNewCardsPerDay?: number;
  dayResetUtcHour?: number;
  ttsPlaybackSpeed?: number;
  dailyGoal?: number;
}): DomainResult<UserSettingsPatch, SrsSettingsFailure> {
  const patch: UserSettingsPatch = {};

  if (input.maxNewCardsPerDay !== undefined) {
    const value = Math.round(input.maxNewCardsPerDay);
    if (value < 0 || value > 200) {
      return fail({
        _tag: "InvalidMaxNewCardsPerDay",
        message: "Max new cards per day must be 0-200",
        value: input.maxNewCardsPerDay,
      });
    }
    patch.maxNewCardsPerDay = value;
  }

  if (input.dayResetUtcHour !== undefined) {
    const value = Math.round(input.dayResetUtcHour);
    if (value < 0 || value > 23) {
      return fail({
        _tag: "InvalidDayResetUtcHour",
        message: "Hour must be 0-23",
        value: input.dayResetUtcHour,
      });
    }
    patch.dayResetUtcHour = value;
  }

  if (input.ttsPlaybackSpeed !== undefined) {
    const value = Math.round(input.ttsPlaybackSpeed * 100) / 100;
    if (value < 0.25 || value > 2.0) {
      return fail({
        _tag: "InvalidTtsPlaybackSpeed",
        message: "Speed must be 0.25-2.0",
        value: input.ttsPlaybackSpeed,
      });
    }
    patch.ttsPlaybackSpeed = value;
  }

  if (input.dailyGoal !== undefined) {
    if (input.dailyGoal < 0 || input.dailyGoal > 500) {
      return fail({
        _tag: "InvalidDailyGoal",
        message: "Daily goal must be 0-500",
        value: input.dailyGoal,
      });
    }
    patch.dailyGoal = input.dailyGoal === 0 ? undefined : input.dailyGoal;
  }

  return ok(patch);
}
