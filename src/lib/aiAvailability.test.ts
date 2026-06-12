import { describe, it, expect } from "vitest";
import { deriveAiAvailability } from "./aiAvailability";

describe("deriveAiAvailability", () => {
  it("returns offline when browser is offline, even if hasLlmKey is true", () => {
    expect(deriveAiAvailability(false, { ok: true, value: { hasLlmKey: true } })).toEqual({
      available: false,
      reason: "offline",
    });
  });

  it("returns offline over loading when both offline and undefined", () => {
    expect(deriveAiAvailability(false, undefined)).toEqual({
      available: false,
      reason: "offline",
    });
  });

  it("returns loading when queryResult is undefined", () => {
    expect(deriveAiAvailability(true, undefined)).toEqual({
      available: false,
      reason: "loading",
    });
  });

  it("returns no-key when the query returns an auth failure", () => {
    expect(deriveAiAvailability(true, {
      ok: false,
      error: { _tag: "Unauthenticated", message: "Please sign in to continue." },
    })).toEqual({
      available: false,
      reason: "no-key",
    });
  });

  it("returns no-key when hasLlmKey is false", () => {
    expect(deriveAiAvailability(true, { ok: true, value: { hasLlmKey: false } })).toEqual({
      available: false,
      reason: "no-key",
    });
  });

  it("returns available when online and hasLlmKey is true", () => {
    expect(deriveAiAvailability(true, { ok: true, value: { hasLlmKey: true } })).toEqual({
      available: true,
      hasLlmKey: true,
    });
  });
});
