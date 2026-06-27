import * as Effect from "effect/Effect";
import { normalizeFieldName } from "./fieldDefinitions";
import { toDomainResult } from "./effect";
import type { DomainFailure, DomainResult } from "./result";
import type { TokenAnnotation, TokenAnnotations } from "../../src/lib/types";
import { codePointLength } from "../../src/lib/tokenAnnotations";

type TokenAnnotationsInput = Readonly<Record<string, readonly TokenAnnotation[]>>;

const MAX_SPANS_PER_FIELD = 100;
const MAX_SPANS_PER_CARD = 500;
const MAX_GLOSS_LENGTH = 200;
const MAX_PINYIN_LENGTH = 200;

export type TokenAnnotationInvalidReason =
  | { kind: "unknown_field" }
  | { kind: "duplicate_field" }
  | { kind: "too_many_annotations_per_field"; max: number; actual: number }
  | { kind: "too_many_annotations_per_card"; max: number; actual: number }
  | { kind: "indexes_must_be_integers"; start: number; end: number; length: number }
  | { kind: "span_out_of_bounds"; start: number; end: number; length: number }
  | { kind: "spans_not_sorted_or_overlapping"; start: number; end: number; previousEnd: number; length: number }
  | { kind: "invalid_gloss"; start: number; end: number; length: number; max: number }
  | { kind: "invalid_reading"; start: number; end: number; length: number; max: number };

export type TokenAnnotationValidationFailure = DomainFailure<
  "TokenAnnotationInvalid",
  {
    code: "annotations_invalid_for_field";
    fieldName: string;
    reason: TokenAnnotationInvalidReason;
  }
>;

function reasonMessage(reason: TokenAnnotationInvalidReason): string {
  switch (reason.kind) {
    case "unknown_field":
      return "Unknown field.";
    case "duplicate_field":
      return "Duplicate annotation field.";
    case "too_many_annotations_per_field":
      return `At most ${reason.max} annotations are allowed per field.`;
    case "too_many_annotations_per_card":
      return `At most ${reason.max} annotations are allowed per card.`;
    case "indexes_must_be_integers":
      return "Annotation indexes must be integers.";
    case "span_out_of_bounds":
      return "Annotation span is outside the field text.";
    case "spans_not_sorted_or_overlapping":
      return "Annotation spans must be sorted and non-overlapping.";
    case "invalid_gloss":
      return `Gloss must be trimmed and 1-${reason.max} characters long.`;
    case "invalid_reading":
      return `Reading must be trimmed and 1-${reason.max} characters long.`;
  }
}

function reasonRange(reason: TokenAnnotationInvalidReason): string {
  switch (reason.kind) {
    case "indexes_must_be_integers":
    case "span_out_of_bounds":
    case "spans_not_sorted_or_overlapping":
    case "invalid_gloss":
    case "invalid_reading":
      return ` at ${reason.start}-${reason.end} (length ${reason.length})`;
    case "unknown_field":
    case "duplicate_field":
    case "too_many_annotations_per_field":
    case "too_many_annotations_per_card":
      return "";
  }
}

function invalidAnnotation({
  fieldName,
  reason,
}: {
  fieldName: string;
  reason: TokenAnnotationInvalidReason;
}): TokenAnnotationValidationFailure {
  return {
    _tag: "TokenAnnotationInvalid",
    code: "annotations_invalid_for_field",
    message: `annotations_invalid_for_field: ${fieldName}${reasonRange(reason)}: ${reasonMessage(reason)}`,
    fieldName,
    reason,
  };
}

function fieldNameLookup(validFieldNames: readonly string[]) {
  const exact = new Set(validFieldNames);
  const byNormalized = new Map<string, string>();
  for (const fieldName of validFieldNames) {
    byNormalized.set(normalizeFieldName(fieldName), fieldName);
  }
  return (fieldName: string): string | null => {
    if (exact.has(fieldName)) return fieldName;
    return byNormalized.get(normalizeFieldName(fieldName)) ?? null;
  };
}

export function validateTokenAnnotationsEffect(
  text: string,
  annotations: readonly TokenAnnotation[],
  fieldName: string,
): Effect.Effect<TokenAnnotation[], TokenAnnotationValidationFailure> {
  return Effect.gen(function* () {
    if (annotations.length > MAX_SPANS_PER_FIELD) {
      return yield* Effect.fail(invalidAnnotation({
        fieldName,
        reason: {
          kind: "too_many_annotations_per_field",
          max: MAX_SPANS_PER_FIELD,
          actual: annotations.length,
        },
      }));
    }

    const length = codePointLength(text);
    let previousEnd = 0;
    const validated: TokenAnnotation[] = [];

    for (const annotation of annotations) {
      const { start, end, gloss, pinyin } = annotation;
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: { kind: "indexes_must_be_integers", start, end, length },
        }));
      }
      if (start < 0 || end <= start || end > length) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: { kind: "span_out_of_bounds", start, end, length },
        }));
      }
      if (start < previousEnd) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: { kind: "spans_not_sorted_or_overlapping", start, end, previousEnd, length },
        }));
      }
      if (gloss !== gloss.trim() || gloss.length < 1 || gloss.length > MAX_GLOSS_LENGTH) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: { kind: "invalid_gloss", start, end, length, max: MAX_GLOSS_LENGTH },
        }));
      }
      if (
        pinyin !== undefined &&
        (pinyin !== pinyin.trim() || pinyin.length < 1 || pinyin.length > MAX_PINYIN_LENGTH)
      ) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: { kind: "invalid_reading", start, end, length, max: MAX_PINYIN_LENGTH },
        }));
      }

      previousEnd = end;
      validated.push(annotation);
    }

    return validated;
  });
}

export function validateTokenAnnotationsForCardEffect({
  validFieldNames,
  fields,
  tokenAnnotations,
}: {
  validFieldNames: readonly string[];
  fields: Record<string, string>;
  tokenAnnotations: TokenAnnotationsInput | undefined;
}): Effect.Effect<TokenAnnotations, TokenAnnotationValidationFailure> {
  return Effect.gen(function* () {
    if (tokenAnnotations === undefined) return {};
    const canonicalName = fieldNameLookup(validFieldNames);
    const normalized: TokenAnnotations = {};
    const seen = new Set<string>();
    let total = 0;

    for (const [rawFieldName, annotations] of Object.entries(tokenAnnotations)) {
      const fieldName = canonicalName(rawFieldName);
      if (fieldName === null) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName: rawFieldName,
          reason: { kind: "unknown_field" },
        }));
      }
      if (seen.has(fieldName)) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: { kind: "duplicate_field" },
        }));
      }
      seen.add(fieldName);
      total += annotations.length;
      if (total > MAX_SPANS_PER_CARD) {
        return yield* Effect.fail(invalidAnnotation({
          fieldName,
          reason: {
            kind: "too_many_annotations_per_card",
            max: MAX_SPANS_PER_CARD,
            actual: total,
          },
        }));
      }
      if (annotations.length === 0) {
        normalized[fieldName] = [];
        continue;
      }
      const validated = yield* validateTokenAnnotationsEffect(
        fields[fieldName] ?? "",
        annotations,
        fieldName,
      );
      normalized[fieldName] = validated;
    }

    return normalized;
  });
}

export function validateTokenAnnotationsForCard({
  validFieldNames,
  fields,
  tokenAnnotations,
}: {
  validFieldNames: readonly string[];
  fields: Record<string, string>;
  tokenAnnotations: TokenAnnotationsInput | undefined;
}): DomainResult<TokenAnnotations, TokenAnnotationValidationFailure> {
  return toDomainResult(
    validateTokenAnnotationsForCardEffect({ validFieldNames, fields, tokenAnnotations }),
  );
}

export function mergeTokenAnnotations(
  existing: TokenAnnotations | undefined,
  incomingPartial: TokenAnnotations,
): TokenAnnotations | undefined {
  if (Object.keys(incomingPartial).length === 0) return undefined;
  const merged: TokenAnnotations = existing ? { ...existing } : {};
  for (const [fieldName, annotations] of Object.entries(incomingPartial)) {
    if (annotations.length === 0) {
      delete merged[fieldName];
    } else {
      merged[fieldName] = annotations;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function stripEmptyTokenAnnotations(
  tokenAnnotations: TokenAnnotations | undefined,
): TokenAnnotations | undefined {
  if (tokenAnnotations === undefined) return undefined;
  const next: TokenAnnotations = {};
  for (const [fieldName, annotations] of Object.entries(tokenAnnotations)) {
    if (annotations.length > 0) next[fieldName] = annotations;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function dropAnnotationsForChangedFields(
  oldFields: Record<string, string>,
  newFields: Record<string, string>,
  existingAnnotations: TokenAnnotations | undefined,
): { tokenAnnotations: TokenAnnotations | undefined; droppedFieldNames: string[] } {
  if (existingAnnotations === undefined) {
    return { tokenAnnotations: undefined, droppedFieldNames: [] };
  }
  const next: TokenAnnotations = {};
  const droppedFieldNames: string[] = [];
  for (const [fieldName, annotations] of Object.entries(existingAnnotations)) {
    const oldValue = oldFields[fieldName] ?? "";
    const newValue = newFields[fieldName] ?? "";
    if (oldValue === newValue) {
      next[fieldName] = annotations;
    } else {
      droppedFieldNames.push(fieldName);
    }
  }
  return {
    tokenAnnotations: Object.keys(next).length > 0 ? next : undefined,
    droppedFieldNames,
  };
}
