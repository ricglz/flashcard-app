import { isCjkChar } from "./cjk";
import type { TokenAnnotation, TokenAnnotations } from "./types";

export type AnnotationTextSpan = {
  text: string;
  start: number;
  end: number;
  isCjk: boolean;
  annotation?: TokenAnnotation;
};

export function codePointLength(text: string): number {
  return Array.from(text).length;
}

export function sliceByCodePoints(text: string, start: number, end: number): string {
  return Array.from(text).slice(start, end).join("");
}

export function normalizeTokenAnnotation(annotation: TokenAnnotation): TokenAnnotation {
  const gloss = annotation.gloss.trim();
  const pinyin = annotation.pinyin?.trim();
  return {
    start: annotation.start,
    end: annotation.end,
    gloss,
    ...(pinyin ? { pinyin } : {}),
  };
}

export function normalizeTokenAnnotations(
  tokenAnnotations: TokenAnnotations | undefined,
): TokenAnnotations | undefined {
  if (tokenAnnotations === undefined) return undefined;
  const normalized: TokenAnnotations = {};
  for (const [fieldName, annotations] of Object.entries(tokenAnnotations)) {
    const fieldAnnotations = annotations
      .map(normalizeTokenAnnotation)
      .filter((annotation) => annotation.gloss.length > 0)
      .toSorted((a, b) => a.start - b.start || a.end - b.end);
    if (fieldAnnotations.length > 0) normalized[fieldName] = fieldAnnotations;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function cloneTokenAnnotations(
  tokenAnnotations: Readonly<Record<string, readonly TokenAnnotation[]>> | undefined,
): TokenAnnotations | undefined {
  if (tokenAnnotations === undefined) return undefined;
  const cloned: TokenAnnotations = {};
  for (const [fieldName, annotations] of Object.entries(tokenAnnotations)) {
    cloned[fieldName] = annotations.map((annotation) => ({ ...annotation }));
  }
  return cloned;
}

export function getAnnotationsForField(
  tokenAnnotations: TokenAnnotations | undefined,
  fieldName: string,
): TokenAnnotation[] {
  return tokenAnnotations?.[fieldName] ?? [];
}

function appendPlainSpans(
  spans: AnnotationTextSpan[],
  chars: string[],
  start: number,
  end: number,
) {
  let index = start;
  while (index < end) {
    const first = chars[index];
    if (first === undefined) return;
    const isCjk = isCjkChar(first);
    let next = index + 1;
    while (next < end) {
      const char = chars[next];
      if (char === undefined || isCjkChar(char) !== isCjk) break;
      next++;
    }
    spans.push({
      text: chars.slice(index, next).join(""),
      start: index,
      end: next,
      isCjk,
    });
    index = next;
  }
}

export function getAnnotationSpans(
  text: string,
  annotations: readonly TokenAnnotation[] = [],
): AnnotationTextSpan[] {
  const chars = Array.from(text);
  const sorted = annotations.toSorted((a, b) => a.start - b.start || a.end - b.end);
  const spans: AnnotationTextSpan[] = [];
  let cursor = 0;

  for (const annotation of sorted) {
    const start = Math.max(0, Math.min(annotation.start, chars.length));
    const end = Math.max(start, Math.min(annotation.end, chars.length));
    if (end <= cursor) continue;
    if (cursor < start) appendPlainSpans(spans, chars, cursor, start);
    spans.push({
      text: chars.slice(start, end).join(""),
      start,
      end,
      isCjk: chars.slice(start, end).some(isCjkChar),
      annotation,
    });
    cursor = end;
  }

  if (cursor < chars.length) appendPlainSpans(spans, chars, cursor, chars.length);
  return spans;
}

export function countTokenAnnotations(tokenAnnotations: TokenAnnotations | undefined): number {
  if (tokenAnnotations === undefined) return 0;
  return Object.values(tokenAnnotations).reduce((count, annotations) => count + annotations.length, 0);
}
