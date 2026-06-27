import { describe, expect, it } from "vitest";
import { tokenizeNonWhitespace } from "./textTokens";

describe("tokenizeNonWhitespace", () => {
  it("preserves code point indexes while skipping whitespace", () => {
    expect(tokenizeNonWhitespace("ni3  hao3 ma")).toEqual([
      { text: "ni3", start: 0, end: 3 },
      { text: "hao3", start: 5, end: 9 },
      { text: "ma", start: 10, end: 12 },
    ]);
  });

  it("counts unicode code points rather than UTF-16 units", () => {
    expect(tokenizeNonWhitespace("lü4 😀")).toEqual([
      { text: "lü4", start: 0, end: 3 },
      { text: "😀", start: 4, end: 5 },
    ]);
  });
});
