import { describe, it, expect } from "vitest";
import type {
  FieldDefinition} from "./types";
import {
  getTtsConfig,
  CARD_RATINGS,
  CARD_RATING_SCORES,
  CARD_RATING_LABELS,
  FIELD_ROLES,
  FIELD_ROLE_LABELS
} from "./types";

describe("getTtsConfig", () => {
  it("returns TTS config when metadata has tts", () => {
    const field: FieldDefinition = {
      name: "Character",
      role: "primary",
      metadata: { tts: { lang: "zh-CN" } },
      order: 0,
    };
    expect(getTtsConfig(field)).toEqual({ lang: "zh-CN" });
  });

  it("returns null when metadata has no tts", () => {
    const field: FieldDefinition = {
      name: "Meaning",
      role: "definition",
      metadata: {},
      order: 0,
    };
    expect(getTtsConfig(field)).toBeNull();
  });
});

describe("constants structural invariants", () => {
  it("every CardRating has a score", () => {
    for (const rating of CARD_RATINGS) {
      expect(CARD_RATING_SCORES[rating]).toBeDefined();
      expect(typeof CARD_RATING_SCORES[rating]).toBe("number");
    }
  });

  it("every CardRating has a label", () => {
    for (const rating of CARD_RATINGS) {
      expect(CARD_RATING_LABELS[rating]).toBeDefined();
      expect(typeof CARD_RATING_LABELS[rating]).toBe("string");
    }
  });

  it("scores range from 0 to 3", () => {
    const scores = Object.values(CARD_RATING_SCORES);
    expect(Math.min(...scores)).toBe(0);
    expect(Math.max(...scores)).toBe(3);
  });

  it("every FieldRole has a label", () => {
    for (const role of FIELD_ROLES) {
      expect(FIELD_ROLE_LABELS[role]).toBeDefined();
      expect(typeof FIELD_ROLE_LABELS[role]).toBe("string");
    }
  });
});
