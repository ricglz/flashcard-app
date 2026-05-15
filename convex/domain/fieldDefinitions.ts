import type { FieldDefinition } from "../../src/lib/types";
import { FIELD_ROLES, isFieldMetadata, isFieldRole, normalizeFieldMetadata } from "../../src/lib/types";
import { fail, ok, type DomainFailure, type DomainResult } from "./result";

export type EmptySetNameFailure = DomainFailure<"EmptySetName">;
export type MissingFieldDefinitionsFailure = DomainFailure<"MissingFieldDefinitions">;
export type EmptyFieldNameFailure = DomainFailure<"EmptyFieldName", { index: number }>;
export type DuplicateFieldNameFailure = DomainFailure<
  "DuplicateFieldName",
  { fieldName: string; normalizedName: string }
>;
export type InvalidFieldOrderFailure = DomainFailure<
  "InvalidFieldOrder",
  { index: number; order: number }
>;
export type DuplicateFieldOrderFailure = DomainFailure<
  "DuplicateFieldOrder",
  { order: number }
>;
export type InvalidFieldRoleFailure = DomainFailure<
  "InvalidFieldRole",
  { index: number; role: string; supportedRoles: readonly string[] }
>;
export type InvalidFieldMetadataFailure = DomainFailure<
  "InvalidFieldMetadata",
  { index: number; fieldName: string }
>;

export type FieldDefinitionsValidationFailure =
  | MissingFieldDefinitionsFailure
  | EmptyFieldNameFailure
  | DuplicateFieldNameFailure
  | InvalidFieldOrderFailure
  | DuplicateFieldOrderFailure
  | InvalidFieldRoleFailure
  | InvalidFieldMetadataFailure;

export type SetFieldsValidationFailure = EmptySetNameFailure | FieldDefinitionsValidationFailure;

export function normalizeFieldName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function validateSetName(
  name: string | undefined
): DomainResult<void, EmptySetNameFailure> {
  if (name !== undefined && name.trim().length === 0) {
    return fail({ _tag: "EmptySetName", message: "Set name must not be empty" });
  }
  return ok(undefined);
}

type FieldDefinitionInput = FieldDefinition | { name: string; role?: FieldDefinition["role"]; metadata?: FieldDefinition["metadata"]; order?: number };

export function validateFieldDefinitions(
  fieldDefinitions: readonly FieldDefinitionInput[] | undefined
): DomainResult<FieldDefinition[] | undefined, FieldDefinitionsValidationFailure> {
  if (fieldDefinitions === undefined) return ok(undefined);
  if (fieldDefinitions.length === 0) {
    return fail({
      _tag: "MissingFieldDefinitions",
      message: "At least one field definition is required",
    });
  }

  const names = new Map<string, string>();
  const orders = new Set<number>();
  const normalized: FieldDefinition[] = [];

  for (let index = 0; index < fieldDefinitions.length; index++) {
    const field = fieldDefinitions[index]!;
    const trimmedName = field.name.trim();
    if (trimmedName.length === 0) {
      return fail({
        _tag: "EmptyFieldName",
        message: "Field names must not be empty",
        index,
      });
    }

    const normalizedName = normalizeFieldName(trimmedName);
    const existingName = names.get(normalizedName);
    if (existingName !== undefined) {
      return fail({
        _tag: "DuplicateFieldName",
        message: `Field names must be unique: ${trimmedName}`,
        fieldName: trimmedName,
        normalizedName,
      });
    }
    names.set(normalizedName, trimmedName);

    const order = field.order ?? index;
    if (!Number.isInteger(order) || order < 0) {
      return fail({
        _tag: "InvalidFieldOrder",
        message: "Field order must be a non-negative integer",
        index,
        order,
      });
    }
    if (orders.has(order)) {
      return fail({
        _tag: "DuplicateFieldOrder",
        message: `Field order values must be unique: ${field.order}`,
        order,
      });
    }
    orders.add(order);

    const role = field.role ?? "primary";
    if (!isFieldRole(role)) {
      return fail({
        _tag: "InvalidFieldRole",
        message: `Unsupported field role: ${String(field.role)}`,
        index,
        role: String(role),
        supportedRoles: FIELD_ROLES,
      });
    }

    const metadata = field.metadata ?? {};
    if (!isFieldMetadata(metadata)) {
      return fail({
        _tag: "InvalidFieldMetadata",
        message: `Invalid metadata for field ${trimmedName}`,
        index,
        fieldName: trimmedName,
      });
    }

    normalized.push({
      name: trimmedName,
      role,
      metadata: normalizeFieldMetadata(metadata),
      order,
    });
  }

  return ok(normalized);
}

export function validateSetFields(
  name: string | undefined,
  fieldDefinitions: readonly FieldDefinition[] | undefined
): DomainResult<
  { name?: string; fieldDefinitions?: FieldDefinition[] },
  SetFieldsValidationFailure
> {
  const nameResult = validateSetName(name);
  if (!nameResult.ok) return nameResult;

  const fieldResult = validateFieldDefinitions(fieldDefinitions);
  if (!fieldResult.ok) return fieldResult;

  return ok({
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(fieldResult.value !== undefined ? { fieldDefinitions: fieldResult.value } : {}),
  });
}
