import * as Effect from "effect/Effect";
import { toDomainResult } from "./effect";
import type { DomainFailure, DomainResult } from "./result";
import { normalizeFieldName } from "./fieldDefinitions";

export type UnknownCardFieldFailure = DomainFailure<
  "UnknownCardField",
  {
    fieldName: string;
    validFieldNames: readonly string[];
  }
>;

export type EmptyCardFieldsFailure = DomainFailure<"EmptyCardFields">;

export type DuplicateCardFieldFailure = DomainFailure<
  "DuplicateCardField",
  { fieldName: string; normalizedName: string }
>;

export type CardFieldsValidationFailure =
  | UnknownCardFieldFailure
  | EmptyCardFieldsFailure
  | DuplicateCardFieldFailure;

export function validateCardFieldsEffect(
  validFieldNames: readonly string[],
  fields: Record<string, string>,
): Effect.Effect<Record<string, string>, CardFieldsValidationFailure> {
  return Effect.gen(function* () {
    const validNames = new Set(validFieldNames);
    const validNormalizedNames = new Set(validFieldNames.map(normalizeFieldName));
    const seen = new Set<string>();
    const fieldNames = Object.keys(fields);

    for (const fieldName of fieldNames) {
      const trimmedName = fieldName.trim();
      const normalizedName = normalizeFieldName(trimmedName);
      if (seen.has(normalizedName)) {
        return yield* Effect.fail({
          _tag: "DuplicateCardField" as const,
          message: `Duplicate field in card: ${trimmedName}`,
          fieldName: trimmedName,
          normalizedName,
        });
      }
      seen.add(normalizedName);

      if (!validNames.has(fieldName) && !validNormalizedNames.has(normalizedName)) {
        return yield* Effect.fail({
          _tag: "UnknownCardField" as const,
          message: `Unknown field: ${fieldName}`,
          fieldName,
          validFieldNames,
        });
      }
    }

    const normalizedFields: Record<string, string> = {};
    for (const validName of validFieldNames) {
      const matchingKey = fieldNames.find(
        (fieldName) => normalizeFieldName(fieldName) === normalizeFieldName(validName),
      );
      if (matchingKey !== undefined) {
        normalizedFields[validName] = fields[matchingKey] ?? "";
      }
    }

    const hasAnyValue = Object.values(normalizedFields).some(
      (value) => value.trim().length > 0,
    );

    if (!hasAnyValue) {
      return yield* Effect.fail({
        _tag: "EmptyCardFields" as const,
        message: "At least one field value is required",
      });
    }

    return normalizedFields;
  });
}

export function validateCardFields(
  validFieldNames: readonly string[],
  fields: Record<string, string>,
): DomainResult<Record<string, string>, CardFieldsValidationFailure> {
  return toDomainResult(validateCardFieldsEffect(validFieldNames, fields));
}
