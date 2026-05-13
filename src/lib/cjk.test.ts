import { describe, it, expect } from "vitest";
import { isCjkChar, hasCjkChars, segmentCjkText } from "./cjk";

describe("isCjkChar", () => {
  it("detects Chinese characters", () => {
    expect(isCjkChar("你")).toBe(true);
    expect(isCjkChar("好")).toBe(true);
    expect(isCjkChar("一")).toBe(true);
    expect(isCjkChar("鿿")).toBe(true);
  });

  it("detects Japanese kana", () => {
    expect(isCjkChar("あ")).toBe(true);
    expect(isCjkChar("カ")).toBe(true);
  });

  it("detects Korean hangul", () => {
    expect(isCjkChar("가")).toBe(true);
    expect(isCjkChar("힯")).toBe(true);
  });

  it("rejects ASCII and Latin characters", () => {
    expect(isCjkChar("A")).toBe(false);
    expect(isCjkChar("z")).toBe(false);
    expect(isCjkChar("5")).toBe(false);
    expect(isCjkChar("!")).toBe(false);
    expect(isCjkChar(" ")).toBe(false);
  });

  it("rejects CJK punctuation", () => {
    expect(isCjkChar("。")).toBe(false);
    expect(isCjkChar("，")).toBe(false);
    expect(isCjkChar("！")).toBe(false);
  });
});

describe("hasCjkChars", () => {
  it("returns true when text contains CJK", () => {
    expect(hasCjkChars("你好")).toBe(true);
    expect(hasCjkChars("hello你好")).toBe(true);
  });

  it("returns false for non-CJK text", () => {
    expect(hasCjkChars("hello world")).toBe(false);
    expect(hasCjkChars("")).toBe(false);
    expect(hasCjkChars("123")).toBe(false);
  });
});

describe("segmentCjkText", () => {
  it("returns empty array for empty string", () => {
    expect(segmentCjkText("")).toEqual([]);
  });

  it("returns single CJK segment for pure CJK", () => {
    expect(segmentCjkText("你好")).toEqual([
      { text: "你好", isCjk: true },
    ]);
  });

  it("returns single non-CJK segment for pure non-CJK", () => {
    expect(segmentCjkText("hello")).toEqual([
      { text: "hello", isCjk: false },
    ]);
  });

  it("segments mixed CJK and non-CJK text", () => {
    expect(segmentCjkText("HSK4级词汇")).toEqual([
      { text: "HSK4", isCjk: false },
      { text: "级词汇", isCjk: true },
    ]);
  });

  it("handles alternating CJK and non-CJK runs", () => {
    expect(segmentCjkText("你好world再见")).toEqual([
      { text: "你好", isCjk: true },
      { text: "world", isCjk: false },
      { text: "再见", isCjk: true },
    ]);
  });

  it("treats spaces as non-CJK", () => {
    expect(segmentCjkText("你 好")).toEqual([
      { text: "你", isCjk: true },
      { text: " ", isCjk: false },
      { text: "好", isCjk: true },
    ]);
  });

  it("handles single character", () => {
    expect(segmentCjkText("你")).toEqual([
      { text: "你", isCjk: true },
    ]);
  });
});
