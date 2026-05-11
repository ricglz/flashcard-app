import { describe, expect, it } from "vitest";
import {
  validateStudySessionSetup,
  validateStudySessionSetupEffect,
} from "../../convex/domain/studySessionSetup";
import { Effect } from "effect";

const fieldDefinitions = [
  { name: "Character", role: "primary" as const, metadata: { tts: { lang: "zh-CN" } }, order: 0 },
  { name: "Pinyin", role: "pronunciation" as const, metadata: {}, order: 1 },
  { name: "Meaning", role: "definition" as const, metadata: {}, order: 2 },
];

describe("validateStudySessionSetup", () => {
  it("returns normalized setup values", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: ["Pinyin"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["Character"],
        cardLimit: 10,
      })
    ).toEqual({
      ok: true,
      value: {
        frontFields: ["Pinyin"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["Character"],
        cardLimit: 10,
      },
    });
  });

  it("defaults missing ttsOnlyFields to an empty array", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: ["Character"],
        backFields: ["Meaning"],
      })
    ).toEqual({
      ok: true,
      value: {
        frontFields: ["Character"],
        backFields: ["Meaning"],
        ttsOnlyFields: [],
      },
    });
  });

  it("returns a typed failure for invalid card limits", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: ["Character"],
        backFields: ["Meaning"],
        cardLimit: 0,
      })
    ).toEqual({
      ok: false,
      error: {
        _tag: "InvalidCardLimit",
        message: "cardLimit must be an integer between 1 and 1000",
        cardLimit: 0,
      },
    });
  });

  it("returns a typed failure for empty field selections", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: [],
        backFields: ["Meaning"],
      })
    ).toEqual({
      ok: false,
      error: {
        _tag: "EmptyStudyFieldSelection",
        message: "frontFields must not be empty",
        selection: "frontFields",
      },
    });
  });

  it("returns a typed failure for unknown field selections", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: ["Missing"],
        backFields: ["Meaning"],
      })
    ).toEqual({
      ok: false,
      error: {
        _tag: "InvalidStudyField",
        message: "Invalid front field: Missing",
        selection: "frontFields",
        fieldName: "Missing",
        validFieldNames: ["Character", "Pinyin", "Meaning"],
      },
    });
  });

  it("returns a typed failure for overlapping TTS-only fields", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: ["Character"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["Character"],
      })
    ).toEqual({
      ok: false,
      error: {
        _tag: "OverlappingTtsOnlyField",
        message: 'Field "Character" cannot be in both ttsOnlyFields and front/back',
        fieldName: "Character",
      },
    });
  });

  it("returns a typed failure for TTS-only fields without TTS metadata", () => {
    expect(
      validateStudySessionSetup({
        fieldDefinitions,
        frontFields: ["Character"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["Pinyin"],
      })
    ).toEqual({
      ok: false,
      error: {
        _tag: "NonTtsOnlyField",
        message: 'Field "Pinyin" has no TTS config and cannot be TTS-only',
        fieldName: "Pinyin",
      },
    });
  });
});

describe("validateStudySessionSetupEffect", () => {
  it("is directly composable as an Effect", () => {
    const result = Effect.runSync(
      validateStudySessionSetupEffect({
        fieldDefinitions,
        frontFields: ["Character"],
        backFields: ["Meaning"],
      })
    );

    expect(result.ttsOnlyFields).toEqual([]);
  });
});
