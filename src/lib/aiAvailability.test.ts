import { describe, it, expect } from "vitest";
import { deriveAiAvailability } from "./aiAvailability";

describe("deriveAiAvailability", () => {
  it("returns offline when browser is offline, even if hasLlmKey is true", () => {
    expect(deriveAiAvailability(false, { hasLlmKey: true })).toEqual({
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

  it("returns no-key when queryResult is null (unauthenticated)", () => {
    expect(deriveAiAvailability(true, null)).toEqual({
      available: false,
      reason: "no-key",
    });
  });

  it("returns no-key when hasLlmKey is false", () => {
    expect(deriveAiAvailability(true, { hasLlmKey: false })).toEqual({
      available: false,
      reason: "no-key",
    });
  });

  it("returns available when online and hasLlmKey is true", () => {
    expect(deriveAiAvailability(true, { hasLlmKey: true })).toEqual({
      available: true,
      hasLlmKey: true,
    });
  });
});
