/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";

const modules = import.meta.glob("../../convex/**/*.ts");

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function createSetWithCards(
  t: ReturnType<typeof convexTest>,
  opts?: { origin?: "manual" | "ai_generated"; cardCount?: number },
) {
  const as = t.withIdentity(TEST_USER);
  const cardCount = opts?.cardCount ?? 2;
  const setId = await unwrap(
    await as.mutation(api.flashcardSets.create, {
      name: "Test Set",
      fieldDefinitions: fieldDefs,
    }),
  );
  for (let i = 0; i < cardCount; i++) {
    await unwrap(
      await as.mutation(api.flashcards.create, {
        setId,
        fields: { Front: `Q${i}`, Back: `A${i}` },
        order: i,
      }),
    );
  }
  return { setId, as };
}

function makeCards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    fields: { Front: `New Q${i}`, Back: `New A${i}` },
  }));
}

describe("appendGeneratedCardsForTool", () => {
  it("appends cards with correct order starting after existing max", async () => {
    const t = convexTest(schema, modules);
    const { setId } = await createSetWithCards(t, { cardCount: 3 });

    await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(2),
    });

    const cards = await t.withIdentity(TEST_USER).query(api.flashcards.list, { setId });
    expect(cards).toHaveLength(5);
    expect(cards[3]!.order).toBe(3);
    expect(cards[4]!.order).toBe(4);
    expect(cards[3]!.fields.Front).toBe("New Q0");
  });

  it("increments set cardCount", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t, { cardCount: 2 });

    await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(3),
    });

    const set = await as.query(api.flashcardSets.get, { id: setId });
    expect(set!.cardCount).toBe(5);
  });

  it("changes manual set origin to mixed", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t);

    await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
    });

    const set = await as.query(api.flashcardSets.get, { id: setId });
    expect(set!.origin).toEqual({ kind: "mixed" });
  });

  it("tags new cards with origin ai_generated", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t);

    await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
    });

    const cards = await as.query(api.flashcards.list, { setId });
    const appended = cards[cards.length - 1]!;
    expect(appended.origin).toBe("ai_generated");
  });

  it("rejects schema fingerprint mismatch", async () => {
    const t = convexTest(schema, modules);
    const { setId } = await createSetWithCards(t);

    const mismatchedFields = [
      { name: "Word", role: "primary" as const, metadata: {}, order: 0 },
      { name: "Translation", role: "definition" as const, metadata: {}, order: 1 },
    ];

    const result = await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: mismatchedFields,
      cards: [{ fields: { Word: "test", Translation: "test" } }],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "Field definitions don't match the target set." },
    });
  });

  it("rejects non-owner", async () => {
    const t = convexTest(schema, modules);
    const { setId } = await createSetWithCards(t);

    const result = await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: OTHER_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "You must own the target set." },
    });
  });

  it("enrolls new cards in SRS when enabled", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t, { cardCount: 1 });

    await as.mutation(api.userSets.update, { setId, srsEnabled: true });

    await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(2),
    });

    const cards = await as.query(api.flashcards.list, { setId });
    expect(cards).toHaveLength(3);
  });

  it("rejects empty cards array", async () => {
    const t = convexTest(schema, modules);
    const { setId } = await createSetWithCards(t);

    const result = await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: [],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "At least one card is required." },
    });
  });
});
