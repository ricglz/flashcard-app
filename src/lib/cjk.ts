const CJK_REGEX =
  /[぀-ゟ゠-ヿ㄀-ㄯ㐀-䶿一-鿿가-힯豈-﫿ᄀ-ᇿ⺀-⻿\u{20000}-\u{2A6DF}]/u;

export function isCjkChar(char: string): boolean {
  return CJK_REGEX.test(char);
}

export function hasCjkChars(text: string): boolean {
  return CJK_REGEX.test(text);
}

export type TextSegment = { text: string; isCjk: boolean };

export function segmentCjkText(text: string): TextSegment[] {
  const chars = Array.from(text);
  const first = chars[0];
  if (first === undefined) return [];

  const segments: TextSegment[] = [];
  let currentIsCjk = isCjkChar(first);
  let currentText: string = first;

  for (const char of chars.slice(1)) {
    const charIsCjk = isCjkChar(char);
    if (charIsCjk === currentIsCjk) {
      currentText += char;
    } else {
      segments.push({ text: currentText, isCjk: currentIsCjk });
      currentIsCjk = charIsCjk;
      currentText = char;
    }
  }
  segments.push({ text: currentText, isCjk: currentIsCjk });

  return segments;
}
