import { describe, expect, it } from "vitest";
import * as Either from "effect/Either";
import * as Schema from "effect/Schema";
import { FieldDefinitionSchema, SetsListResponseSchema } from "./aiToolingSchemas";

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
