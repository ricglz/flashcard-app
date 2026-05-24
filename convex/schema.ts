import { defineSchema, defineTable } from "convex/server";
import { v, type Validator } from "convex/values";
import {
  CARD_RATINGS,
  FIELD_ROLES,
  METHODOLOGIES,
  SESSION_STATUSES,
  VISIBILITIES,
} from "../src/lib/types";

// src/lib/types.ts owns the literal arrays. Keep this dependency one-way:
// app/shared types must not import validators from this schema module.
function literalUnion<const Values extends readonly [string, ...string[]]>(
  values: Values,
) {
  const validators = values.map((value) => v.literal(value)) as {
    [Index in keyof Values]: Validator<Values[Index] & string, "required", never>;
  };
  return v.union(...validators);
}

export const fieldDefinitionValidator = v.object({
  name: v.string(),
  role: literalUnion(FIELD_ROLES),
  metadata: v.union(
    v.object({}),
    v.object({ tts: v.object({ lang: v.string() }) }),
  ),
  order: v.number(),
});

export const ratingValidator = literalUnion(CARD_RATINGS);

export const srsCardStatusValidator = v.union(
  v.literal("new"),
  v.literal("learning"),
  v.literal("review")
);

export const userSetRoleValidator = v.union(
  v.literal("owner"),
  v.literal("member")
);

export const weakContextMethodologyValidator = literalUnion(METHODOLOGIES);

export const sourceScopeValidator = v.union(
  v.literal("single_set"),
  v.literal("srs_enabled_sets"),
  v.literal("custom")
);

export const setOriginValidator = v.union(
  v.object({ kind: v.literal("manual") }),
  v.object({ kind: v.literal("csv_import"), importedAt: v.number() }),
  v.object({
    kind: v.literal("ai_generated"),
    generatedAt: v.number(),
    sourceSetIds: v.array(v.id("flashcardSets")),
    sourceScope: sourceScopeValidator,
    weakContextMethodology: v.optional(weakContextMethodologyValidator),
  }),
  v.object({
    kind: v.literal("forked"),
    sourceSetId: v.id("flashcardSets"),
    forkedAt: v.number(),
  }),
  v.object({ kind: v.literal("mixed") })
);

export const cliScopeValidator = v.union(
  v.literal("sets:read"),
  v.literal("weak_context:read"),
  v.literal("ai_sets:create"),
  v.literal("srs:enroll")
);

export default defineSchema({
  flashcardSets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
    shareToken: v.optional(v.string()),
    fieldDefinitions: v.array(fieldDefinitionValidator),
    cardCount: v.number(),
    updatedAt: v.number(),
    origin: setOriginValidator,
    visibility: literalUnion(VISIBILITIES),
    createdAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_visibility_and_createdAt", ["visibility", "createdAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["visibility"] })
    .searchIndex("search_description", { searchField: "description", filterFields: ["visibility"] }),

  flashcards: defineTable({
    setId: v.id("flashcardSets"),
    fields: v.record(v.string(), v.string()),
    order: v.number(),
    origin: v.optional(v.union(
      v.literal("manual"),
      v.literal("csv_import"),
      v.literal("ai_generated"),
    )),
  }).index("by_setId", ["setId"]),

  studySessions: defineTable({
    setId: v.id("flashcardSets"),
    userId: v.string(),
    frontFields: v.array(v.string()),
    backFields: v.array(v.string()),
    ttsOnlyFields: v.array(v.string()),
    cardOrder: v.array(v.id("flashcards")),
    currentIndex: v.number(),
    status: literalUnion(SESSION_STATUSES),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    overallScore: v.optional(v.number()),
  })
    .index("by_setId_and_userId", ["setId", "userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_setId_and_userId_and_status", [
      "setId",
      "userId",
      "status",
    ]),

  cardResults: defineTable({
    sessionId: v.id("studySessions"),
    cardId: v.id("flashcards"),
    rating: ratingValidator,
    timestamp: v.number(),
  }).index("by_sessionId", ["sessionId"]),

  userSets: defineTable({
    userId: v.string(),
    setId: v.id("flashcardSets"),
    role: userSetRoleValidator,
    srsEnabled: v.boolean(),
    defaultFrontFields: v.array(v.string()),
    defaultBackFields: v.array(v.string()),
    defaultTtsOnlyFields: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_setId", ["userId", "setId"])
    .index("by_setId", ["setId"]),

  srsCards: defineTable({
    userId: v.string(),
    cardId: v.id("flashcards"),
    setId: v.id("flashcardSets"),
    easeFactor: v.number(),
    interval: v.number(),
    repetitions: v.number(),
    nextReviewAt: v.number(),
    lastReviewedAt: v.optional(v.number()),
    status: srsCardStatusValidator,
  })
    .index("by_userId_and_nextReviewAt", ["userId", "nextReviewAt"])
    .index("by_userId_and_setId", ["userId", "setId"])
    .index("by_cardId_and_userId", ["cardId", "userId"])
    .index("by_setId", ["setId"]),

  reviewQueue: defineTable({
    userId: v.string(),
    cardId: v.id("flashcards"),
    srsCardId: v.id("srsCards"),
    setId: v.id("flashcardSets"),
    queuedAt: v.number(),
    order: v.number(),
  })
    .index("by_userId_and_order", ["userId", "order"])
    .index("by_srsCardId", ["srsCardId"]),

  srsReviews: defineTable({
    userId: v.string(),
    cardId: v.id("flashcards"),
    srsCardId: v.id("srsCards"),
    rating: ratingValidator,
    timestamp: v.number(),
    newInterval: v.number(),
    newEaseFactor: v.number(),
  })
    .index("by_srsCardId", ["srsCardId"])
    .index("by_userId", ["userId"])
    .index("by_userId_and_timestamp", ["userId", "timestamp"]),

  dailyStats: defineTable({
    userId: v.string(),
    dayKey: v.string(),
    dayStartMs: v.number(),
    srsReviewCount: v.number(),
    sessionCardCount: v.number(),
    correctCount: v.number(),
    totalRatingScore: v.number(),
  })
    .index("by_userId_and_dayKey", ["userId", "dayKey"])
    .index("by_userId_and_dayStartMs", ["userId", "dayStartMs"]),

  userSettings: defineTable({
    userId: v.string(),
    maxNewCardsPerDay: v.number(),
    dayResetUtcHour: v.optional(v.number()),
    ttsPlaybackSpeed: v.optional(v.number()),
    dailyGoal: v.optional(v.number()),
    llmProvider: v.optional(v.string()),
    llmApiKey: v.optional(v.string()),
    customChatPrompt: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  cliAccessTokens: defineTable({
    userId: v.string(),
    publicId: v.string(),
    tokenHash: v.string(),
    label: v.optional(v.string()),
    scopes: v.array(cliScopeValidator),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.number(),
    absoluteExpiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_publicId", ["publicId"])
    .index("by_userId", ["userId"]),

  cardAnnotations: defineTable({
    userId: v.string(),
    cardId: v.id("flashcards"),
    setId: v.id("flashcardSets"),
    flagged: v.boolean(),
    note: v.optional(v.string()),
  })
    .index("by_userId_and_cardId", ["userId", "cardId"])
    .index("by_userId_and_setId", ["userId", "setId"])
    .index("by_userId_and_flagged", ["userId", "flagged"])
    .index("by_userId", ["userId"]),
});
