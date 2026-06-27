import type { Doc, Id } from "../../convex/_generated/dataModel";

// Convex schema imports the literal arrays from this file. Keep this module free
// of runtime imports from convex/schema.ts so generated types remain one-way.
function isOneOf<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.some((item) => item === value);
}

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
  return isOneOf(FIELD_ROLES, value);
}

export type FieldMetadata = {
  tts?: {
    lang: string;
  };
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

export type FieldDefinition = {
  name: string;
  role: FieldRole;
  metadata: FieldMetadata;
  order: number;
};

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

export type TokenAnnotation = {
  start: number;
  end: number;
  gloss: string;
  pinyin?: string;
};

export type TokenAnnotations = Record<string, TokenAnnotation[]>;

export function getDefaultFieldLayout(fieldDefinitions: readonly FieldDefinition[]): {
  defaultFrontFields: string[];
  defaultBackFields: string[];
} {
  const sorted = [...fieldDefinitions].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  return {
    defaultFrontFields: first ? [first.name] : [],
    defaultBackFields: sorted.slice(1).map((fd) => fd.name),
  };
}

export const CARD_RATINGS = ["wrong", "hard", "good", "easy"] as const;
export type CardRating = (typeof CARD_RATINGS)[number];

export function isCardRating(value: unknown): value is CardRating {
  return isOneOf(CARD_RATINGS, value);
}

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

export const CARD_RATING_SCORES = {
  wrong: 0,
  hard: 1,
  good: 2,
  easy: 3,
} as const satisfies Record<CardRating, number>;

export const FLASHCARD_ORIGINS = [
  "manual",
  "csv_import",
  "ai_generated",
  "forked",
] as const;

export const LEGACY_FLASHCARD_ORIGINS = FLASHCARD_ORIGINS;

export type FlashcardOrigin =
  | { kind: "manual" }
  | { kind: "csv_import" }
  | { kind: "ai_generated" }
  | { kind: "forked"; sourceSetId?: Id<"flashcardSets"> }
  | { kind: "merged"; sourceSetId: Id<"flashcardSets"> };

export type SetOrigin =
  | { kind: "manual" }
  | { kind: "csv_import"; importedAt: number }
  | {
      kind: "ai_generated";
      generatedAt: number;
      sourceSetIds: Id<"flashcardSets">[];
      sourceScope: "single_set" | "srs_enabled_sets" | "custom";
      weakContextMethodology?: Methodology;
    }
  | { kind: "forked"; sourceSetId: Id<"flashcardSets">; forkedAt: number }
  | { kind: "mixed" }
  | { kind: "merged"; sourceSetIds: Id<"flashcardSets">[]; mergedAt: number };

export function normalizeCardOrigin(value: unknown): FlashcardOrigin {
  if (typeof value === "string") {
    if (LEGACY_FLASHCARD_ORIGINS.includes(value as (typeof LEGACY_FLASHCARD_ORIGINS)[number])) {
      if (value === "forked") return { kind: "forked" };
      return { kind: value as "manual" | "csv_import" | "ai_generated" };
    }
    return { kind: "manual" };
  }
  if (value && typeof value === "object") {
    const obj = value as { kind?: unknown; sourceSetId?: unknown };
    const kind = obj.kind;
    if (kind === "manual" || kind === "csv_import" || kind === "ai_generated") {
      return { kind };
    }
    if (kind === "forked") {
      return { kind: "forked", sourceSetId: obj.sourceSetId as Id<"flashcardSets"> | undefined };
    }
    if (kind === "merged" && typeof obj.sourceSetId === "string") {
      return { kind: "merged", sourceSetId: obj.sourceSetId as Id<"flashcardSets"> };
    }
  }
  return { kind: "manual" };
}

export function normalizeSetOrigin(value: unknown): SetOrigin {
  if (value && typeof value === "object") {
    const obj = value as { kind?: unknown; sourceSetIds?: unknown };
    if (obj.kind === "merged" && Array.isArray(obj.sourceSetIds)) return value as SetOrigin;
    if (typeof obj.kind === "string") return value as SetOrigin;
  }
  return { kind: "manual" };
}

export const METHODOLOGIES = [
  "balanced",
  "recent_lapses",
  "low_ease",
  "learning_stuck",
] as const;
export type Methodology = (typeof METHODOLOGIES)[number];

export function isMethodology(value: unknown): value is Methodology {
  return isOneOf(METHODOLOGIES, value);
}

export const METHODOLOGY_LABELS: Record<Methodology, string> = {
  balanced: "Balanced",
  recent_lapses: "Recent Lapses",
  low_ease: "Low Ease",
  learning_stuck: "Learning Stuck",
};

export const VISIBILITIES = ["private", "unlisted", "public"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export function isVisibility(value: unknown): value is Visibility {
  return isOneOf(VISIBILITIES, value);
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
};

export const SESSION_STATUSES = [
  "in_progress",
  "completed",
  "abandoned",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type Viewer =
  | { role: "owner"; userSet: Doc<"userSets"> }
  | { role: "member"; userSet: Doc<"userSets"> }
  | { role: "visitor"; userSet: null };

export type TypedFlashcardSet = Omit<Doc<"flashcardSets">, "fieldDefinitions"> & {
  fieldDefinitions: FieldDefinition[];
};

export type TypedCardResult = Omit<Doc<"cardResults">, "rating"> & {
  rating: CardRating;
};

export type PublicFlashcardSet = Omit<Doc<"flashcardSets">, "visibility"> & {
  visibility: "public";
};

export type ActiveStudySession = Omit<Doc<"studySessions">, "status"> & {
  status: "in_progress";
};

export function isActiveStudySession(
  session: Doc<"studySessions">,
): session is ActiveStudySession {
  return session.status === "in_progress";
}

export function isPublicFlashcardSet(
  set: Doc<"flashcardSets">,
): set is PublicFlashcardSet {
  return set.visibility === "public" && set.archivedAt === undefined;
}
