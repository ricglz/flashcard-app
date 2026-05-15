/**
 * Type-safe helpers for working with Convex documents.
 * 
 * Convex generates types from the schema, but the schema uses loose types
 * (e.g., v.any() for metadata) for flexibility. These helpers provide
 * type-safe access to commonly used fields.
 */

import type { Doc } from "../_generated/dataModel";
import type { FieldDefinition } from "../../src/lib/types";
import { normalizeFieldMetadata, isFieldRole } from "../../src/lib/types";

/**
 * Extracts typed field definitions from a flashcard set document.
 * 
 * Convex stores fieldDefinitions with metadata as Record<string, any>,
 * but we want the typed FieldDefinition[] with FieldMetadata.
 * This function safely narrows the type and normalizes metadata.
 */
export function getFieldDefinitions(
  set: Doc<"flashcardSets">
): FieldDefinition[] {
  return set.fieldDefinitions.map((fd) => ({
    name: fd.name,
    role: isFieldRole(fd.role) ? fd.role : "primary",
    metadata: normalizeFieldMetadata(fd.metadata),
    order: fd.order,
  }));
}