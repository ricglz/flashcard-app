export type TextToken = {
  text: string;
  start: number;
  end: number;
};

const WHITESPACE = /\s/u;

export function tokenizeNonWhitespace(text: string): TextToken[] {
  const chars = Array.from(text);
  const tokens: TextToken[] = [];
  let index = 0;

  while (index < chars.length) {
    while (index < chars.length && WHITESPACE.test(chars[index] ?? "")) index++;
    const start = index;
    while (index < chars.length && !WHITESPACE.test(chars[index] ?? "")) index++;
    if (index > start) {
      tokens.push({
        text: chars.slice(start, index).join(""),
        start,
        end: index,
      });
    }
  }

  return tokens;
}
