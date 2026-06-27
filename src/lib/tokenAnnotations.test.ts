import { describe, expect, it } from "vitest";
import {
  cloneTokenAnnotations,
  codePointLength,
  getAnnotationSpans,
  normalizeTokenAnnotations,
  sliceByCodePoints,
} from "./tokenAnnotations";

describe("token annotation helpers", () => {
  it("uses code point indexes", () => {
    expect(codePointLength("你😀好")).toBe(3);
    expect(sliceByCodePoints("你😀好", 1, 3)).toBe("😀好");
  });

  it("normalizes annotations without keeping blank glosses", () => {
    expect(
      normalizeTokenAnnotations({
        Front: [
          { start: 2, end: 3, gloss: "  later  ", pinyin: " " },
          { start: 0, end: 1, gloss: "" },
        ],
      }),
    ).toEqual({
      Front: [{ start: 2, end: 3, gloss: "later" }],
    });
  });

  it("clones readonly annotation maps", () => {
    const source = {
      Front: [{ start: 0, end: 1, gloss: "you" }],
    } as const;

    const cloned = cloneTokenAnnotations(source);

    expect(cloned).toEqual(source);
    expect(cloned?.Front).not.toBe(source.Front);
  });

  it("merges annotation spans with default CJK segmentation", () => {
    expect(
      getAnnotationSpans("你好abc", [{ start: 0, end: 2, gloss: "hello" }]),
    ).toEqual([
      {
        text: "你好",
        start: 0,
        end: 2,
        isCjk: true,
        annotation: { start: 0, end: 2, gloss: "hello" },
      },
      { text: "abc", start: 2, end: 5, isCjk: false },
    ]);
  });
});

