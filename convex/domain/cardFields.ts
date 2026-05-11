import { fail, ok, type DomainFailure, type DomainResult } from "./result";

export type UnknownCardFieldFailure = DomainFailure<
  "UnknownCardField",
  {
    fieldName: string;
    validFieldNames: readonly string[];
  }
>;

export type EmptyCardFieldsFailure = DomainFailure<"EmptyCardFields">;

export type CardFieldsValidationFailure =
  | UnknownCardFieldFailure
  | EmptyCardFieldsFailure;

export function validateCardFields(
  validFieldNames: readonly string[],
  fields: Record<string, string>
): DomainResult<void, CardFieldsValidationFailure> {
  const validNames = new Set(validFieldNames);
  const fieldNames = Object.keys(fields);

  for (const fieldName of fieldNames) {
    if (!validNames.has(fieldName)) {
      return fail({
        _tag: "UnknownCardField",
        message: `Unknown field: ${fieldName}`,
        fieldName,
        validFieldNames,
      });
    }
  }

  const hasAnyValue = fieldNames.some(
    (fieldName) => fields[fieldName].trim().length > 0
  );

  if (!hasAnyValue) {
    return fail({
      _tag: "EmptyCardFields",
      message: "At least one field value is required",
    });
  }

  return ok(undefined);
}
