import * as Schema from "effect/Schema";

export const FieldRoleSchema = Schema.Literal(
  "primary",
  "pronunciation",
  "definition",
  "note"
);

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

export const CardRatingSchema = Schema.Literal("wrong", "hard", "good", "easy");
export const SrsCardStatusSchema = Schema.Literal("new", "learning", "review");

export const CliScopeSchema = Schema.Literal(
  "sets:read",
  "weak_context:read",
  "ai_sets:create",
  "srs:enroll"
);

export const WeakContextMethodologySchema = Schema.Literal(
  "balanced",
  "recent_lapses",
  "low_ease",
  "learning_stuck"
);

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
      setId: Schema.String,
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
  Schema.Struct({ kind: Schema.Literal("set"), setId: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("sets"), setIds: Schema.Array(Schema.String) })
);
export type WeakCardsScope = Schema.Schema.Type<typeof WeakCardsScopeSchema>;

export const WeakCardsRequestSchema = Schema.Struct({
  scope: Schema.optional(WeakCardsScopeSchema),
  methodology: Schema.optional(WeakContextMethodologySchema),
  filters: Schema.optional(
    Schema.Struct({
      days: Schema.optional(Schema.Number),
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

export const WeakCardsResponseSchema = Schema.Struct({
  scope: WeakCardsScopeSchema,
  methodology: WeakContextMethodologySchema,
  generatedAt: Schema.Number,
  schemaGroups: Schema.Array(
    Schema.Struct({
      schemaFingerprint: Schema.String,
      fieldDefinitions: Schema.Array(FieldDefinitionSchema),
      sets: Schema.Array(
        Schema.Struct({
          setId: Schema.String,
          name: Schema.String,
          weakCards: Schema.Array(
            Schema.Struct({
              cardId: Schema.String,
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
  sourceSetIds: Schema.Array(Schema.String),
  sourceScope: SourceScopeSchema,
  weakContextMethodology: Schema.optional(WeakContextMethodologySchema),
  fieldDefinitions: Schema.Array(FieldDefinitionSchema),
  cards: Schema.Array(
    Schema.Struct({
      fields: Schema.Record({ key: Schema.String, value: Schema.String }),
      sourceCardIds: Schema.optional(Schema.Array(Schema.String)),
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
  setId: Schema.String,
  cardCount: Schema.Number,
  srsEnabled: Schema.Boolean,
});
export type GeneratedSetCreateResponse = Schema.Schema.Type<typeof GeneratedSetCreateResponseSchema>;

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
    .map((field) => `${field.name}:${field.role}:${JSON.stringify(field.metadata ?? {})}`)
    .join("|");
}
