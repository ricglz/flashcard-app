import { describe, it, expect } from "vitest";
import type {
  FieldDefinition} from "./types";
import {
  getTtsConfig,
  CARD_RATINGS,
  CARD_RATING_SCORES,
  CARD_RATING_LABELS,
  FIELD_ROLES,
  FIELD_ROLE_LABELS,
  isCardRating,
  isActiveStudySession,
  isFieldRole,
  isMethodology,
  isPublicFlashcardSet,
  isVisibility,
} from "./types";
import { parseId } from "./convexHelpers";

const testSetId = parseId<"flashcardSets">("abc123def456ghi7");
if (testSetId === null) throw new Error("Invalid test set ID.");
const testSessionId = parseId<"studySessions">("abc123def456ghi8");
if (testSessionId === null) throw new Error("Invalid test session ID.");

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

describe("literal type guards", () => {
  it("narrows known literal values", () => {
    expect(isFieldRole("primary")).toBe(true);
    expect(isCardRating("good")).toBe(true);
    expect(isMethodology("balanced")).toBe(true);
    expect(isVisibility("public")).toBe(true);
  });

  it("rejects unknown literal values", () => {
    expect(isFieldRole("front")).toBe(false);
    expect(isCardRating("ok")).toBe(false);
    expect(isMethodology("fast")).toBe(false);
    expect(isVisibility("shared")).toBe(false);
  });
});

describe("isPublicFlashcardSet", () => {
  it("narrows sets with public visibility", () => {
    expect(isPublicFlashcardSet({
      _id: testSetId,
      _creationTime: 1,
      name: "Public",
      ownerId: "user",
      fieldDefinitions: [],
      cardCount: 0,
      updatedAt: 1,
      origin: { kind: "manual" },
      visibility: "public",
      createdAt: 1,
    })).toBe(true);
  });

  it("rejects non-public sets", () => {
    expect(isPublicFlashcardSet({
      _id: testSetId,
      _creationTime: 1,
      name: "Private",
      ownerId: "user",
      fieldDefinitions: [],
      cardCount: 0,
      updatedAt: 1,
      origin: { kind: "manual" },
      visibility: "private",
      createdAt: 1,
    })).toBe(false);
  });
});

describe("isActiveStudySession", () => {
  it("narrows in-progress sessions", () => {
    expect(isActiveStudySession({
      _id: testSessionId,
      _creationTime: 1,
      setId: testSetId,
      userId: "user",
      frontFields: ["Front"],
      backFields: ["Back"],
      ttsOnlyFields: [],
      cardOrder: [],
      currentIndex: 0,
      status: "in_progress",
      startedAt: 1,
    })).toBe(true);
  });
});
