import * as Schema from "effect/Schema";
import type { Id, TableNames } from "../../convex/_generated/dataModel";
import { FIELD_ROLES, CARD_RATINGS } from "./types";
import { METHODOLOGIES } from "./types";
import { parseId } from "./convexHelpers";

const CONVEX_ID_PATTERN = /^[a-z0-9]{16,64}$/;

const ConvexId = <T extends TableNames>(_table: T) => {
  const idSchema = Schema.declare(
    (input: unknown): input is Id<T> => typeof input === "string" && parseId<T>(input) !== null,
  );
  return Schema.transform(Schema.String.pipe(Schema.pattern(CONVEX_ID_PATTERN)), idSchema, {
    strict: true,
    decode: (s) => {
      const id = parseId<T>(s);
      if (id === null) throw new Error(`Invalid Convex ${_table} ID.`);
      return id;
    },
    encode: (id) => String(id),
  });
};

export const FieldRoleSchema = Schema.Literal(...FIELD_ROLES);

export const FieldMetadataSchema = Schema.Struct({
  tts: Schema.optional(
    Schema.Struct({
      lang: Schema.String.pipe(Schema.minLength(1)),
    })
  ),
});

export const FieldDefinitionSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  role: FieldRoleSchema,
  metadata: FieldMetadataSchema,
  order: Schema.Number,
});

export const CardRatingSchema = Schema.Literal(...CARD_RATINGS);
export const SrsCardStatusSchema = Schema.Literal("new", "learning", "review");

export const CliScopeSchema = Schema.Literal(
  "sets:read",
  "weak_context:read",
  "ai_sets:create",
  "srs:enroll"
);

export const WeakContextMethodologySchema = Schema.Literal(...METHODOLOGIES);

export const SourceScopeSchema = Schema.Literal(
  "single_set",
  "srs_enabled_sets",
  "custom"
);

export const SetOriginSummarySchema = Schema.Struct({
  kind: Schema.String,
});

export const SetsListRequestSchema = Schema.Struct({
  include: Schema.optional(
    Schema.Struct({
      srsSummary: Schema.optional(Schema.Boolean),
      schemaFingerprint: Schema.optional(Schema.Boolean),
      fieldDefinitions: Schema.optional(Schema.Boolean),
    })
  ),
});
export type SetsListRequest = Schema.Schema.Type<typeof SetsListRequestSchema>;

export const SetsListResponseSchema = Schema.Struct({
  sets: Schema.Array(
    Schema.Struct({
      setId: ConvexId("flashcardSets"),
      name: Schema.String,
      description: Schema.optional(Schema.String),
      srsEnabled: Schema.Boolean,
      cardCount: Schema.Number,
      origin: Schema.optional(SetOriginSummarySchema),
      fieldDefinitions: Schema.optional(Schema.Array(FieldDefinitionSchema)),
      schemaFingerprint: Schema.optional(Schema.String),
      srsSummary: Schema.optional(
        Schema.Struct({
          new: Schema.Number,
          learning: Schema.Number,
          review: Schema.Number,
          weakCandidateCount: Schema.Number,
          avgEase: Schema.Number,
        })
      ),
    })
  ),
});
export type SetsListResponse = Schema.Schema.Type<typeof SetsListResponseSchema>;

export const WeakCardsScopeSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("srs_enabled_sets") }),
  Schema.Struct({ kind: Schema.Literal("set"), setId: ConvexId("flashcardSets") }),
  Schema.Struct({ kind: Schema.Literal("sets"), setIds: Schema.Array(ConvexId("flashcardSets")) })
);
export type WeakCardsScope = Schema.Schema.Type<typeof WeakCardsScopeSchema>;

const MAX_REVIEW_FILTER_MS = 365 * 24 * 60 * 60 * 1000;

export type WeakCardsReviewFilter =
  | { kind: "relative_days"; days: number }
  | { kind: "calendar_range"; startMs: number; endMs: number };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasOnlyKeys(input: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(input).every((key) => allowed.has(key));
}

function isWeakCardsReviewFilter(input: unknown): input is WeakCardsReviewFilter {
  if (!isRecord(input)) return false;
  if (input.kind === "relative_days") {
    return (
      hasOnlyKeys(input, ["kind", "days"]) &&
      typeof input.days === "number" &&
      Number.isFinite(input.days) &&
      Number.isInteger(input.days) &&
      input.days >= 1 &&
      input.days <= 365
    );
  }
  if (input.kind === "calendar_range") {
    return (
      hasOnlyKeys(input, ["kind", "startMs", "endMs"]) &&
      typeof input.startMs === "number" &&
      typeof input.endMs === "number" &&
      Number.isFinite(input.startMs) &&
      Number.isFinite(input.endMs) &&
      input.startMs < input.endMs &&
      input.endMs - input.startMs <= MAX_REVIEW_FILTER_MS
    );
  }
  return false;
}

export const WeakCardsReviewFilterSchema = Schema.declare(
  isWeakCardsReviewFilter,
);

export const WeakCardsRequestSchema = Schema.Struct({
  scope: Schema.optional(WeakCardsScopeSchema),
  methodology: Schema.optional(WeakContextMethodologySchema),
  filters: Schema.optional(
    Schema.Struct({
      reviewFilter: Schema.optional(WeakCardsReviewFilterSchema),
      minReviews: Schema.optional(Schema.Number),
      ratings: Schema.optional(Schema.Array(CardRatingSchema)),
      statuses: Schema.optional(Schema.Array(SrsCardStatusSchema)),
      maxEaseFactor: Schema.optional(Schema.Number),
      excludeAiGeneratedSets: Schema.optional(Schema.Boolean),
    })
  ),
  limits: Schema.optional(
    Schema.Struct({
      limitPerSet: Schema.optional(Schema.Number),
      totalLimit: Schema.optional(Schema.Number),
    })
  ),
  include: Schema.optional(
    Schema.Struct({
      recentRatings: Schema.optional(Schema.Boolean),
      siblingContext: Schema.optional(Schema.Boolean),
      strongCardSamples: Schema.optional(Schema.Boolean),
    })
  ),
});
export type WeakCardsRequest = Schema.Schema.Type<typeof WeakCardsRequestSchema>;

export const WeakReasonSchema = Schema.Literal(
  "recent_wrong_rating",
  "recent_hard_rating",
  "low_ease_factor",
  "learning_status",
  "many_reviews_not_graduated",
  "recently_due_again"
);
export type WeakReason = Schema.Schema.Type<typeof WeakReasonSchema>;

export const WeakCardsResponseSchema = Schema.Struct({
  scope: WeakCardsScopeSchema,
  methodology: WeakContextMethodologySchema,
  reviewFilter: WeakCardsReviewFilterSchema,
  generatedAt: Schema.Number,
  schemaGroups: Schema.Array(
    Schema.Struct({
      schemaFingerprint: Schema.String,
      fieldDefinitions: Schema.Array(FieldDefinitionSchema),
      sets: Schema.Array(
        Schema.Struct({
          setId: ConvexId("flashcardSets"),
          name: Schema.String,
          weakCards: Schema.Array(
            Schema.Struct({
              cardId: ConvexId("flashcards"),
              fields: Schema.Record({ key: Schema.String, value: Schema.String }),
              weakScore: Schema.Number,
              weakReasons: Schema.Array(WeakReasonSchema),
              metrics: Schema.Struct({
                reviewCount: Schema.Number,
                wrongCount: Schema.Number,
                hardCount: Schema.Number,
                lastRating: Schema.optional(CardRatingSchema),
                easeFactor: Schema.Number,
                repetitions: Schema.Number,
                status: SrsCardStatusSchema,
                lastReviewedAt: Schema.optional(Schema.Number),
              }),
              recentRatings: Schema.optional(Schema.Array(CardRatingSchema)),
            })
          ),
        })
      ),
    })
  ),
});
export type WeakCardsResponse = Schema.Schema.Type<typeof WeakCardsResponseSchema>;

export const GeneratedSetPayloadSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
  sourceSetIds: Schema.Array(ConvexId("flashcardSets")),
  sourceScope: SourceScopeSchema,
  weakContextMethodology: Schema.optional(WeakContextMethodologySchema),
  fieldDefinitions: Schema.Array(FieldDefinitionSchema),
  cards: Schema.Array(
    Schema.Struct({
      fields: Schema.Record({ key: Schema.String, value: Schema.String }),
      sourceCardIds: Schema.optional(Schema.Array(ConvexId("flashcards"))),
      rationale: Schema.optional(Schema.String),
    })
  ),
  addToSrs: Schema.Boolean,
});
export type GeneratedSetPayload = Schema.Schema.Type<typeof GeneratedSetPayloadSchema>;

export const GeneratedSetValidationResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  issues: Schema.Array(Schema.String),
  normalized: Schema.optional(GeneratedSetPayloadSchema),
});
export type GeneratedSetValidationResponse = Schema.Schema.Type<typeof GeneratedSetValidationResponseSchema>;

export const GeneratedSetCreateResponseSchema = Schema.Struct({
  setId: ConvexId("flashcardSets"),
  cardCount: Schema.Number,
  srsEnabled: Schema.Boolean,
});
export type GeneratedSetCreateResponse = Schema.Schema.Type<typeof GeneratedSetCreateResponseSchema>;

export const CurrentCardNoteToolParamsSchema = Schema.Struct({
  note: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500)),
});
export type CurrentCardNoteToolParams = Schema.Schema.Type<typeof CurrentCardNoteToolParamsSchema>;

export const TokenStatusResponseSchema = Schema.Struct({
  authenticated: Schema.Boolean,
  scopes: Schema.optional(Schema.Array(CliScopeSchema)),
  lastUsedAt: Schema.optional(Schema.Number),
  expiresAt: Schema.optional(Schema.Number),
  absoluteExpiresAt: Schema.optional(Schema.Number),
});
export type TokenStatusResponse = Schema.Schema.Type<typeof TokenStatusResponseSchema>;

export const ApiErrorResponseSchema = Schema.Struct({
  error: Schema.Struct({
    code: Schema.String,
    message: Schema.String,
  }),
});
export type ApiErrorResponse = Schema.Schema.Type<typeof ApiErrorResponseSchema>;

export function schemaFingerprint(
  fieldDefinitions: ReadonlyArray<Schema.Schema.Type<typeof FieldDefinitionSchema>>
): string {
  return [...fieldDefinitions]
    .sort((a, b) => a.order - b.order)
    .map((field) => `${field.name}:${field.role}:${JSON.stringify(field.metadata)}`)
    .join("|");
}
