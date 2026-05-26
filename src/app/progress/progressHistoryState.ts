import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type DailyHistoryResult = FunctionReturnType<typeof api.progress.getDailyHistory>;
type DailyHistory = Extract<DailyHistoryResult, { ok: true }>["value"];

const MALFORMED_CACHE_MESSAGE =
  "Progress data could not be loaded. Refreshing...";

export type ProgressHistoryState =
  | { status: "loading" }
  | { status: "ready"; history: DailyHistory }
  | { status: "error"; message: string }
  | { status: "malformedCache"; message: string };

export function classifyProgressHistoryResult(
  result: DailyHistoryResult | unknown | undefined,
): ProgressHistoryState {
  if (result === undefined) {
    return { status: "loading" };
  }

  if (!isRecord(result) || typeof result.ok !== "boolean") {
    return malformedCache();
  }

  if (result.ok) {
    return Array.isArray(result.value) && result.value.every(isDailyHistoryEntry)
      ? { status: "ready", history: result.value }
      : malformedCache();
  }

  const message = readFailureMessage(result.error);
  return message !== null ? { status: "error", message } : malformedCache();
}

function malformedCache(): ProgressHistoryState {
  return { status: "malformedCache", message: MALFORMED_CACHE_MESSAGE };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFailureMessage(error: unknown): string | null {
  if (!isRecord(error) || typeof error.message !== "string") {
    return null;
  }
  const message = error.message.trim();
  return message.length > 0 ? message : null;
}

function isDailyHistoryEntry(value: unknown): value is DailyHistory[number] {
  return (
    isRecord(value) &&
    typeof value.dayKey === "string" &&
    typeof value.dayStartMs === "number" &&
    typeof value.totalCards === "number" &&
    typeof value.correctCount === "number" &&
    typeof value.accuracy === "number"
  );
}
