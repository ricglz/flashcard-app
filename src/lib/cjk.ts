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
  if (chars.length === 0) return [];

  const segments: TextSegment[] = [];
  let currentIsCjk = isCjkChar(chars[0]!);
  let currentText: string = chars[0]!;

  for (let i = 1; i < chars.length; i++) {
    const charIsCjk = isCjkChar(chars[i]!);
    if (charIsCjk === currentIsCjk) {
      currentText += chars[i]!;
    } else {
      segments.push({ text: currentText, isCjk: currentIsCjk });
      currentIsCjk = charIsCjk;
      currentText = chars[i]!;
    }
  }
  segments.push({ text: currentText, isCjk: currentIsCjk });

  return segments;
}
