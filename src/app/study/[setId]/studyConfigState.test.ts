import { describe, expect, it } from "vitest";
import {
  buildBrowseSearchParams,
  buildStartSessionArgs,
  buildStudyModeHref,
  canSubmitStudyConfig,
} from "./studyConfigState";

describe("canSubmitStudyConfig", () => {
  it("requires front fields, back fields, and cards", () => {
    expect(
      canSubmitStudyConfig({
        mode: "browse",
        frontFields: [],
        backFields: ["Back"],
        cardCount: 10,
        isAuthenticated: true,
      }),
    ).toBe(false);
    expect(
      canSubmitStudyConfig({
        mode: "browse",
        frontFields: ["Front"],
        backFields: ["Back"],
        cardCount: 0,
        isAuthenticated: true,
      }),
    ).toBe(false);
  });

  it("requires auth for study mode but not browse mode", () => {
    const shared = {
      frontFields: ["Front"],
      backFields: ["Back"],
      cardCount: 10,
      isAuthenticated: false,
    };

    expect(canSubmitStudyConfig({ ...shared, mode: "study" })).toBe(false);
    expect(canSubmitStudyConfig({ ...shared, mode: "browse" })).toBe(true);
  });
});

describe("buildBrowseSearchParams", () => {
  it("encodes selected fields and optional card limit", () => {
    expect(
      buildBrowseSearchParams({
        frontFields: ["Front"],
        backFields: ["Back", "Example"],
        ttsOnlyFields: ["Pronunciation"],
        shuffle: false,
        cardLimit: 25,
      }).toString(),
    ).toBe(
      "frontFields=Front&backFields=Back%2CExample&shuffle=false&ttsOnlyFields=Pronunciation&cardLimit=25",
    );
  });

  it("omits optional params when unset", () => {
    expect(
      buildBrowseSearchParams({
        frontFields: ["Front"],
        backFields: ["Back"],
        ttsOnlyFields: [],
        shuffle: true,
        cardLimit: null,
      }).toString(),
    ).toBe("frontFields=Front&backFields=Back&shuffle=true");
  });
});

describe("buildStartSessionArgs", () => {
  it("builds mutation args with optional card limit", () => {
    expect(
      buildStartSessionArgs({
        setId: "set-id",
        frontFields: ["Front"],
        backFields: ["Back"],
        ttsOnlyFields: [],
        shuffle: true,
        cardLimit: 10,
      }),
    ).toEqual({
      setId: "set-id",
      frontFields: ["Front"],
      backFields: ["Back"],
      ttsOnlyFields: [],
      shuffle: true,
      cardLimit: 10,
    });
  });
});

describe("buildStudyModeHref", () => {
  it("adds browse mode and preserves unrelated query params", () => {
    expect(buildStudyModeHref("https://example.com/study/abc?foo=bar", "browse")).toBe(
      "/study/abc?foo=bar&mode=browse",
    );
  });

  it("removes browse mode for study mode", () => {
    expect(buildStudyModeHref("https://example.com/study/abc?mode=browse&foo=bar", "study")).toBe(
      "/study/abc?foo=bar",
    );
  });
});
