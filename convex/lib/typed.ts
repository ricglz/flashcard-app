import type { Doc } from "../_generated/dataModel";
import type { FieldDefinition } from "../../src/lib/types";
import { normalizeFieldMetadata, isFieldRole } from "../../src/lib/types";

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
