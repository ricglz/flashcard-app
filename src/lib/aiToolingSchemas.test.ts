import { describe, expect, it } from "vitest";
import * as Either from "effect/Either";
import * as Schema from "effect/Schema";
import {
  CurrentCardNoteToolParamsSchema,
  FieldDefinitionSchema,
  SetsListResponseSchema,
  WeakCardsReviewFilterSchema,
} from "./aiToolingSchemas";
import { ChatRequestSchema } from "./chatSchemas";

describe("AI tooling ID schemas", () => {
  it("rejects malformed Convex IDs before branding", () => {
    const decoded = Schema.decodeUnknownEither(SetsListResponseSchema)({
      sets: [
        {
          setId: "../not-an-id",
          name: "Bad ID",
          srsEnabled: true,
          cardCount: 1,
        },
      ],
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  it("accepts Convex ID-shaped values", () => {
    const decoded = Schema.decodeUnknownEither(SetsListResponseSchema)({
      sets: [
        {
          setId: "abc123def456ghi7",
          name: "Valid ID",
          srsEnabled: true,
          cardCount: 1,
        },
      ],
    });

    expect(Either.isRight(decoded)).toBe(true);
  });
});

describe("AI tooling field definition schema", () => {
  it("rejects invalid field roles", () => {
    const decoded = Schema.decodeUnknownEither(FieldDefinitionSchema)({
      name: "Front",
      role: "front",
      metadata: {},
      order: 0,
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });
});

describe("weak cards review filter schema", () => {
  it("accepts valid relative day and calendar range filters", () => {
    const relative = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)({
      kind: "relative_days",
      days: 30,
    });
    const calendar = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)({
      kind: "calendar_range",
      startMs: 1000,
      endMs: 2000,
    });

    expect(Either.isRight(relative)).toBe(true);
    expect(Either.isRight(calendar)).toBe(true);
  });

  it("rejects malformed or mixed filter shapes", () => {
    const mixed = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)({
      kind: "relative_days",
      days: 30,
      startMs: 1000,
      endMs: 2000,
    });
    const badDays = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)({
      kind: "relative_days",
      days: 0,
    });
    const badRange = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)({
      kind: "calendar_range",
      startMs: 2000,
      endMs: 1000,
    });
    const nonFinite = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)({
      kind: "calendar_range",
      startMs: Number.NaN,
      endMs: 1000,
    });

    expect(Either.isLeft(mixed)).toBe(true);
    expect(Either.isLeft(badDays)).toBe(true);
    expect(Either.isLeft(badRange)).toBe(true);
    expect(Either.isLeft(nonFinite)).toBe(true);
  });
});

describe("current card note tool schema", () => {
  it("accepts a non-empty note", () => {
    const decoded = Schema.decodeUnknownEither(CurrentCardNoteToolParamsSchema)({
      note: "A concise review note.",
    });

    expect(Either.isRight(decoded)).toBe(true);
  });

  it("rejects missing or too-long notes", () => {
    const missing = Schema.decodeUnknownEither(CurrentCardNoteToolParamsSchema)({});
    const tooLong = Schema.decodeUnknownEither(CurrentCardNoteToolParamsSchema)({
      note: "x".repeat(501),
    });

    expect(Either.isLeft(missing)).toBe(true);
    expect(Either.isLeft(tooLong)).toBe(true);
  });
});

describe("chat request schema", () => {
  it("accepts current card note context", () => {
    const decoded = Schema.decodeUnknownEither(ChatRequestSchema)({
      message: "Add that as a note",
      history: [],
      context: {
        setId: "abc123def456ghi7",
        cardId: "abc123def456ghi8",
        hasNote: false,
        cardFields: { Front: "term", Back: "definition" },
      },
    });

    expect(Either.isRight(decoded)).toBe(true);
  });
});
