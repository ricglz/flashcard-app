import { fail, ok, type DomainFailure, type DomainResult } from "./result";
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

export function validateCardFields(
  validFieldNames: readonly string[],
  fields: Record<string, string>
): DomainResult<Record<string, string>, CardFieldsValidationFailure> {
  const validNames = new Set(validFieldNames);
  const validNormalizedNames = new Set(validFieldNames.map(normalizeFieldName));
  const seen = new Set<string>();
  const fieldNames = Object.keys(fields);

  for (const fieldName of fieldNames) {
    const trimmedName = fieldName.trim();
    const normalizedName = normalizeFieldName(trimmedName);
    if (seen.has(normalizedName)) {
      return fail({
        _tag: "DuplicateCardField",
        message: `Duplicate field in card: ${trimmedName}`,
        fieldName: trimmedName,
        normalizedName,
      });
    }
    seen.add(normalizedName);

    if (!validNames.has(fieldName) && !validNormalizedNames.has(normalizedName)) {
      return fail({
        _tag: "UnknownCardField",
        message: `Unknown field: ${fieldName}`,
        fieldName,
        validFieldNames,
      });
    }
  }

  const normalizedFields: Record<string, string> = {};
  for (const validName of validFieldNames) {
    const matchingKey = fieldNames.find(
      (fieldName) => normalizeFieldName(fieldName) === normalizeFieldName(validName)
    );
    if (matchingKey !== undefined) {
      normalizedFields[validName] = fields[matchingKey] ?? "";
    }
  }

  const hasAnyValue = Object.values(normalizedFields).some(
    (value) => value.trim().length > 0
  );

  if (!hasAnyValue) {
    return fail({
      _tag: "EmptyCardFields",
      message: "At least one field value is required",
    });
  }

  return ok(normalizedFields);
}
