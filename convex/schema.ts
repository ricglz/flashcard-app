import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const fieldDefinitionValidator = v.object({
  name: v.string(),
  role: v.union(
    v.literal("primary"),
    v.literal("pronunciation"),
    v.literal("definition"),
    v.literal("note")
  ),
  metadata: v.record(v.string(), v.any()),
  order: v.number(),
});

export default defineSchema({
  flashcardSets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
    shareToken: v.optional(v.string()),
    fieldDefinitions: v.array(fieldDefinitionValidator),
    createdAt: v.number(),
  }).index("by_ownerId", ["ownerId"]),

  flashcards: defineTable({
    setId: v.id("flashcardSets"),
    fields: v.record(v.string(), v.string()),
    order: v.number(),
  }).index("by_setId", ["setId"]),

  studySessions: defineTable({
    setId: v.id("flashcardSets"),
    userId: v.string(),
    frontFields: v.array(v.string()),
    backFields: v.array(v.string()),
    cardOrder: v.array(v.id("flashcards")),
    currentIndex: v.number(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("abandoned")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    overallScore: v.optional(v.number()),
  })
    .index("by_setId_and_userId", ["setId", "userId"])
    .index("by_userId_and_status", ["userId", "status"]),

  cardResults: defineTable({
    sessionId: v.id("studySessions"),
    cardId: v.id("flashcards"),
    rating: v.union(
      v.literal("wrong"),
      v.literal("hard"),
      v.literal("good"),
      v.literal("easy")
    ),
    timestamp: v.number(),
  }).index("by_sessionId", ["sessionId"]),
});
