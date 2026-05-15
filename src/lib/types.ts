/**
 * Shared types and constants — single source of truth.
 *
 * FieldRole, FieldMetadata, and related types are the canonical definitions
 * used by the DB schema, UI, and TTS engine. Extend them here.
 */

// ---------------------------------------------------------------------------
// Field Roles
// ---------------------------------------------------------------------------

/** Semantic roles a field can play within a flashcard set. */
export const FIELD_ROLES = [
  "primary",
  "pronunciation",
  "definition",
  "note",
] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

export const FIELD_ROLE_LABELS: Record<FieldRole, string> = {
  primary: "Primary",
  pronunciation: "Pronunciation",
  definition: "Definition",
  note: "Note",
};

export function isFieldRole(value: unknown): value is FieldRole {
  return typeof value === "string" && FIELD_ROLES.includes(value as FieldRole);
}

// ---------------------------------------------------------------------------
// Field Metadata — typed blocks, presence = enabled
// ---------------------------------------------------------------------------

/**
 * Structured metadata for a field definition.
 * Each optional block enables a feature. Extend this type when adding new
 * metadata-driven features — this is THE canonical list.
 */
export type FieldMetadata = {
  /** If present, TTS is enabled for this field. */
  tts?: {
    /** BCP-47 language tag, e.g. "zh-CN", "es", "en-US" */
    lang: string;
  };
  // Future blocks — extend here:
  // display?: { fontSize: "small" | "normal" | "large" };
  // validation?: { pattern: string };
};

export function isFieldMetadata(value: unknown): value is FieldMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const metadata = value as Record<string, unknown>;
  if (metadata.tts === undefined) return true;
  if (
    metadata.tts === null ||
    typeof metadata.tts !== "object" ||
    Array.isArray(metadata.tts)
  ) {
    return false;
  }
  const tts = metadata.tts as Record<string, unknown>;
  return typeof tts.lang === "string" && tts.lang.trim().length > 0;
}

export function normalizeFieldMetadata(value: unknown): FieldMetadata {
  if (!isFieldMetadata(value)) return {};
  const metadata = value as FieldMetadata;
  return metadata.tts ? { tts: { lang: metadata.tts.lang.trim() } } : {};
}

// ---------------------------------------------------------------------------
// Field Definitions
// ---------------------------------------------------------------------------

export type FieldDefinition = {
  name: string;
  role: FieldRole;
  metadata: FieldMetadata;
  order: number;
};

// ---------------------------------------------------------------------------
// Metadata Accessors
// ---------------------------------------------------------------------------

/** Returns TTS config if enabled for this field, null otherwise. */
export function getTtsConfig(
  field: FieldDefinition
): { lang: string } | null {
  return field.metadata.tts ?? null;
}

export function getTtsEnabledFields(
  fieldDefinitions: readonly FieldDefinition[]
): FieldDefinition[] {
  return fieldDefinitions.filter((field) => getTtsConfig(field) !== null);
}

export function getDisplayableFields(
  fieldDefinitions: readonly FieldDefinition[]
): FieldDefinition[] {
  return [...fieldDefinitions].sort((a, b) => a.order - b.order);
}

export function getStudyableFieldNames(
  fieldDefinitions: readonly FieldDefinition[]
): string[] {
  return getDisplayableFields(fieldDefinitions).map((field) => field.name);
}

export function getDefaultFieldLayout(fieldDefinitions: readonly FieldDefinition[]): {
  defaultFrontFields: string[];
  defaultBackFields: string[];
} {
  const sorted = [...fieldDefinitions].sort((a, b) => a.order - b.order);
  return {
    defaultFrontFields: sorted.length > 0 ? [sorted[0]!.name] : [],
    defaultBackFields: sorted.slice(1).map((fd) => fd.name),
  };
}

// ---------------------------------------------------------------------------
// Card Ratings
// ---------------------------------------------------------------------------

export const CARD_RATINGS = ["wrong", "hard", "good", "easy"] as const;
export type CardRating = (typeof CARD_RATINGS)[number];

export const CARD_RATING_LABELS: Record<CardRating, string> = {
  wrong: "Wrong",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export const SRS_RATING_LABELS: Record<CardRating, string> = {
  wrong: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

/** Numeric score per rating for computing session averages. */
export const CARD_RATING_SCORES: Record<CardRating, number> = {
  wrong: 0,
  hard: 1,
  good: 2,
  easy: 3,
};

// ---------------------------------------------------------------------------
// Weak Context Methodology
// ---------------------------------------------------------------------------

export const METHODOLOGIES = [
  "balanced",
  "recent_lapses",
  "low_ease",
  "learning_stuck",
] as const;
export type Methodology = (typeof METHODOLOGIES)[number];

// ---------------------------------------------------------------------------
// Session Status
// ---------------------------------------------------------------------------

export const SESSION_STATUSES = [
  "in_progress",
  "completed",
  "abandoned",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Narrowed Convex document types
// ---------------------------------------------------------------------------
// Convex returns metadata as Record<string, any> and rating as string.
// These types narrow once at the query boundary so downstream code is typed.

import type { Doc } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Viewer (set access role for the current user)
// ---------------------------------------------------------------------------

export type Viewer =
  | { role: "owner"; userSet: Doc<"userSets"> }
  | { role: "member"; userSet: Doc<"userSets"> }
  | { role: "visitor"; userSet: null };

/** Flashcard set with typed fieldDefinitions (narrows Convex's any metadata). */
export type TypedFlashcardSet = Omit<Doc<"flashcardSets">, "fieldDefinitions"> & {
  fieldDefinitions: FieldDefinition[];
};

/** Card result with typed rating (narrows Convex's string to CardRating). */
export type TypedCardResult = Omit<Doc<"cardResults">, "rating"> & {
  rating: CardRating;
};
