import { describe, expect, it } from "vitest";
import { classifyProgressHistoryResult } from "./progressHistoryState";

const historyEntry = {
  dayKey: "2026-05-26",
  dayStartMs: 1779778800000,
  totalCards: 4,
  correctCount: 3,
  accuracy: 0.75,
};

describe("classifyProgressHistoryResult", () => {
  it("returns loading when the query is unresolved", () => {
    expect(classifyProgressHistoryResult(undefined)).toEqual({
      status: "loading",
    });
  });

  it("returns ready for valid empty history", () => {
    expect(classifyProgressHistoryResult({ ok: true, value: [] })).toEqual({
      status: "ready",
      history: [],
    });
  });

  it("returns ready for valid history entries", () => {
    expect(
      classifyProgressHistoryResult({ ok: true, value: [historyEntry] }),
    ).toEqual({
      status: "ready",
      history: [historyEntry],
    });
  });

  it("returns an error for typed failures", () => {
    expect(
      classifyProgressHistoryResult({
        ok: false,
        error: {
          _tag: "InvalidInput",
          message: "days must be an integer between 1 and 365",
          field: "days",
        },
      }),
    ).toEqual({
      status: "error",
      message: "days must be an integer between 1 and 365",
    });
  });

  it("flags failed results with missing errors as malformed cache", () => {
    expect(classifyProgressHistoryResult({ ok: false })).toEqual({
      status: "malformedCache",
      message: "Progress data could not be loaded. Refreshing...",
    });
  });

  it("flags failed results with malformed errors as malformed cache", () => {
    expect(
      classifyProgressHistoryResult({ ok: false, error: {} }),
    ).toEqual({
      status: "malformedCache",
      message: "Progress data could not be loaded. Refreshing...",
    });
  });

  it("flags successful results with malformed values as malformed cache", () => {
    expect(classifyProgressHistoryResult({ ok: true })).toEqual({
      status: "malformedCache",
      message: "Progress data could not be loaded. Refreshing...",
    });
  });

  it("flags successful results with malformed history entries as malformed cache", () => {
    expect(
      classifyProgressHistoryResult({
        ok: true,
        value: [{ ...historyEntry, totalCards: "4" }],
      }),
    ).toEqual({
      status: "malformedCache",
      message: "Progress data could not be loaded. Refreshing...",
    });
  });
});
