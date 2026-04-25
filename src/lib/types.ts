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

/** Flashcard set with typed fieldDefinitions (narrows Convex's any metadata). */
export type TypedFlashcardSet = Omit<Doc<"flashcardSets">, "fieldDefinitions"> & {
  fieldDefinitions: FieldDefinition[];
};

/** Card result with typed rating (narrows Convex's string to CardRating). */
export type TypedCardResult = Omit<Doc<"cardResults">, "rating"> & {
  rating: CardRating;
};
