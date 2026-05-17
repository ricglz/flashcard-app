import * as Effect from "effect/Effect";
import type { FieldDefinition } from "../../src/lib/types";
import { FIELD_ROLES, isFieldMetadata, isFieldRole, normalizeFieldMetadata } from "../../src/lib/types";
import { toDomainResult } from "./effect";
import type { DomainFailure, DomainResult } from "./result";

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

export function validateSetNameEffect(
  name: string | undefined,
): Effect.Effect<void, EmptySetNameFailure> {
  if (name !== undefined && name.trim().length === 0) {
    return Effect.fail({ _tag: "EmptySetName" as const, message: "Set name must not be empty" });
  }
  return Effect.void;
}

export function validateSetName(
  name: string | undefined,
): DomainResult<void, EmptySetNameFailure> {
  return toDomainResult(validateSetNameEffect(name));
}

type FieldDefinitionInput = FieldDefinition | { name: string; role?: FieldDefinition["role"]; metadata?: FieldDefinition["metadata"]; order?: number };

export function validateFieldDefinitionsEffect(
  fieldDefinitions: readonly FieldDefinitionInput[] | undefined,
): Effect.Effect<FieldDefinition[] | undefined, FieldDefinitionsValidationFailure> {
  return Effect.gen(function* () {
    if (fieldDefinitions === undefined) return undefined;
    if (fieldDefinitions.length === 0) {
      return yield* Effect.fail({
        _tag: "MissingFieldDefinitions" as const,
        message: "At least one field definition is required",
      });
    }

    const names = new Map<string, string>();
    const orders = new Set<number>();
    const normalized: FieldDefinition[] = [];

    for (const [index, field] of fieldDefinitions.entries()) {
      const trimmedName = field.name.trim();
      if (trimmedName.length === 0) {
        return yield* Effect.fail({
          _tag: "EmptyFieldName" as const,
          message: "Field names must not be empty",
          index,
        });
      }

      const normalizedName = normalizeFieldName(trimmedName);
      const existingName = names.get(normalizedName);
      if (existingName !== undefined) {
        return yield* Effect.fail({
          _tag: "DuplicateFieldName" as const,
          message: `Field names must be unique: ${trimmedName}`,
          fieldName: trimmedName,
          normalizedName,
        });
      }
      names.set(normalizedName, trimmedName);

      const order = field.order ?? index;
      if (!Number.isInteger(order) || order < 0) {
        return yield* Effect.fail({
          _tag: "InvalidFieldOrder" as const,
          message: "Field order must be a non-negative integer",
          index,
          order,
        });
      }
      if (orders.has(order)) {
        return yield* Effect.fail({
          _tag: "DuplicateFieldOrder" as const,
          message: `Field order values must be unique: ${field.order}`,
          order,
        });
      }
      orders.add(order);

      const role = field.role ?? "primary";
      if (!isFieldRole(role)) {
        return yield* Effect.fail({
          _tag: "InvalidFieldRole" as const,
          message: `Unsupported field role: ${String(field.role)}`,
          index,
          role: String(role),
          supportedRoles: FIELD_ROLES,
        });
      }

      const metadata = field.metadata ?? {};
      if (!isFieldMetadata(metadata)) {
        return yield* Effect.fail({
          _tag: "InvalidFieldMetadata" as const,
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

    return normalized;
  });
}

export function validateFieldDefinitions(
  fieldDefinitions: readonly FieldDefinitionInput[] | undefined,
): DomainResult<FieldDefinition[] | undefined, FieldDefinitionsValidationFailure> {
  return toDomainResult(validateFieldDefinitionsEffect(fieldDefinitions));
}

export function validateSetFieldsEffect(
  name: string | undefined,
  fieldDefinitions: readonly FieldDefinition[] | undefined,
): Effect.Effect<
  { name?: string; fieldDefinitions?: FieldDefinition[] },
  SetFieldsValidationFailure
> {
  return Effect.gen(function* () {
    yield* validateSetNameEffect(name);
    const fields = yield* validateFieldDefinitionsEffect(fieldDefinitions);
    return {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(fields !== undefined ? { fieldDefinitions: fields } : {}),
    };
  });
}

export function validateSetFields(
  name: string | undefined,
  fieldDefinitions: readonly FieldDefinition[] | undefined,
): DomainResult<
  { name?: string; fieldDefinitions?: FieldDefinition[] },
  SetFieldsValidationFailure
> {
  return toDomainResult(validateSetFieldsEffect(name, fieldDefinitions));
}
