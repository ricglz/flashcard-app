"use client";

import { useState } from "react";
import { isCjkChar } from "@/lib/cjk";
import { tokenizeNonWhitespace } from "@/lib/textTokens";
import {
  codePointLength,
  normalizeTokenAnnotation,
  sliceByCodePoints,
} from "@/lib/tokenAnnotations";
import type { FieldDefinition, TokenAnnotation } from "@/lib/types";
import { Button } from "./ui/Button";
import { TextInput } from "./ui/TextInput";

type SelectableToken = {
  text: string;
  start: number;
  end: number;
};

type TextRange = {
  start: number;
  end: number;
};

function selectableTokens(text: string, field: FieldDefinition): SelectableToken[] {
  if (field.role === "pronunciation") return tokenizeNonWhitespace(text);
  return Array.from(text).flatMap((char, index) =>
    isCjkChar(char) ? [{ text: char, start: index, end: index + 1 }] : [],
  );
}

function rangesOverlap(first: TextRange, second: TextRange): boolean {
  return first.start < second.end && second.start < first.end;
}

function selectedAnnotation(
  annotations: readonly TokenAnnotation[],
  selection: { start: number; end: number },
) {
  return annotations.find(
    (annotation) => annotation.start === selection.start && annotation.end === selection.end,
  );
}

function nextAnnotations(
  annotations: readonly TokenAnnotation[],
  annotation: TokenAnnotation,
): TokenAnnotation[] {
  return [
    ...annotations.filter((item) => item.end <= annotation.start || item.start >= annotation.end),
    annotation,
  ].toSorted((a, b) => a.start - b.start || a.end - b.end);
}

export default function TokenAnnotationEditor({
  field,
  text,
  annotations,
  onChange,
}: {
  field: FieldDefinition;
  text: string;
  annotations: TokenAnnotation[];
  onChange: (annotations: TokenAnnotation[]) => void;
}) {
  const tokens = selectableTokens(text, field);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [gloss, setGloss] = useState("");
  const [reading, setReading] = useState("");
  const length = codePointLength(text);
  const selectedText = selection && selection.end <= length
    ? sliceByCodePoints(text, selection.start, selection.end)
    : "";
  const canSave = selection !== null && selectedText.length > 0 && gloss.trim().length > 0;

  if (tokens.length === 0 && annotations.length === 0) return null;

  const chooseToken = (token: SelectableToken, extend: boolean) => {
    const nextSelection = extend && selection
      ? {
          start: Math.min(selection.start, token.start),
          end: Math.max(selection.end, token.end),
        }
      : { start: token.start, end: token.end };
    const existing = selectedAnnotation(annotations, nextSelection);
    setSelection(nextSelection);
    setGloss(existing?.gloss ?? "");
    setReading(existing?.pinyin ?? "");
  };

  const saveAnnotation = () => {
    if (!selection || !canSave) return;
    const annotation = normalizeTokenAnnotation({
      start: selection.start,
      end: selection.end,
      gloss,
      ...(reading.trim() ? { pinyin: reading } : {}),
    });
    onChange(nextAnnotations(annotations, annotation));
    setGloss("");
    setReading("");
    setSelection(null);
  };

  return (
    <div className="mt-2 rounded-lg border border-edge bg-raised/40 p-2">
      {tokens.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tokens.map((token) => {
            const isSelected = selection === null ? false : rangesOverlap(token, selection);
            const hasAnnotation = annotations.some((annotation) => rangesOverlap(token, annotation));
            return (
              <button
                key={`${token.start}-${token.end}`}
                type="button"
                onClick={(event) => chooseToken(token, event.shiftKey)}
                className={[
                  "min-h-7 rounded border px-2 py-1 text-sm transition-colors",
                  isSelected
                    ? "border-accent bg-accent-surface text-accent"
                    : hasAnnotation
                      ? "border-success-edge bg-success-surface text-success"
                      : "border-edge bg-card-bg hover:bg-surface-hover",
                ].join(" ")}
              >
                {token.text}
              </button>
            );
          })}
        </div>
      )}

      {selection && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <TextInput
            value={gloss}
            onChange={(event) => setGloss(event.target.value)}
            placeholder={`Meaning for ${selectedText}`}
            aria-label={`Gloss for ${selectedText}`}
          />
          <TextInput
            value={reading}
            onChange={(event) => setReading(event.target.value)}
            placeholder="Reading"
            aria-label={`Reading for ${selectedText}`}
          />
          <Button type="button" size="sm" onClick={saveAnnotation} disabled={!canSave}>
            Save
          </Button>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {annotations.map((annotation) => (
            <span
              key={`${annotation.start}-${annotation.end}`}
              className="inline-flex max-w-full items-center gap-1 rounded border border-edge bg-card-bg px-2 py-1 text-xs"
            >
              <span className="truncate">
                {sliceByCodePoints(text, annotation.start, annotation.end)}: {annotation.gloss}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    annotations.filter(
                      (item) => item.start !== annotation.start || item.end !== annotation.end,
                    ),
                  )
                }
                className="text-muted hover:text-danger"
                aria-label={`Delete annotation ${annotation.gloss}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
