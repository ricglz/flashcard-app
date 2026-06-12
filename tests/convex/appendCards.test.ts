import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { Id } from "../../convex/_generated/dataModel";
import type { TestDb } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function createSetWithCards(
  t: TestDb,
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

async function getSrsCardsForSet(
  t: TestDb,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("srsCards")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", userId).eq("setId", setId)
      )
      .take(10);
  });
}

async function getSrsCardsForCard(
  t: TestDb,
  cardId: Id<"flashcards">,
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("srsCards")
      .withIndex("by_cardId", (q) => q.eq("cardId", cardId))
      .take(10);
  });
}

describe("createGeneratedSetForTool", () => {
  it("creates generated-set cards with origin ai_generated", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(internal.tooling.createGeneratedSetForTool, {
      userId: TEST_USER.tokenIdentifier,
      name: "Generated",
      sourceSetIds: [],
      sourceScope: "custom",
      fieldDefinitions: fieldDefs,
      cards: makeCards(2),
      addToSrs: false,
    });
    const created = await unwrap(result);
    expect(created.cardCount).toBe(2);

    const cards = await unwrap(
      await t.withIdentity(TEST_USER).query(api.flashcards.list, {
        setId: created.setId,
      }),
    );
    expect(cards.map((card) => card.origin)).toEqual([
      "ai_generated",
      "ai_generated",
    ]);

    const set = await unwrap(
      await t.withIdentity(TEST_USER).query(api.flashcardSets.get, {
        id: created.setId,
      }),
    );
    expect(set.cardCount).toBe(2);
  });

  it("honors addToSrs when creating generated sets", async () => {
    const t = convexTest(schema, modules);

    const disabled = await unwrap(await t.mutation(internal.tooling.createGeneratedSetForTool, {
      userId: TEST_USER.tokenIdentifier,
      name: "Generated without SRS",
      sourceSetIds: [],
      sourceScope: "custom",
      fieldDefinitions: fieldDefs,
      cards: makeCards(2),
      addToSrs: false,
    }));
    const enabled = await unwrap(await t.mutation(internal.tooling.createGeneratedSetForTool, {
      userId: TEST_USER.tokenIdentifier,
      name: "Generated with SRS",
      sourceSetIds: [],
      sourceScope: "custom",
      fieldDefinitions: fieldDefs,
      cards: makeCards(2),
      addToSrs: true,
    }));

    expect(await getSrsCardsForSet(t, TEST_USER.tokenIdentifier, disabled.setId)).toHaveLength(0);
    expect(await getSrsCardsForSet(t, TEST_USER.tokenIdentifier, enabled.setId)).toHaveLength(2);
  });
});

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

    const cards = await unwrap(await t.withIdentity(TEST_USER).query(api.flashcards.list, { setId }));
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

    const result = await as.query(api.flashcardSets.get, { id: setId });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.cardCount).toBe(5);
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

    const result = await as.query(api.flashcardSets.get, { id: setId });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.origin).toEqual({ kind: "mixed" });
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

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
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

    await as.mutation(api.userSets.enableSrs, { setId });

    await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(2),
    });

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    expect(cards).toHaveLength(3);
  });

  it("enrolls appended cards for all SRS-enabled set users", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t, { cardCount: 1 });
    const member = t.withIdentity(OTHER_USER);

    await unwrap(
      await as.mutation(api.flashcardSets.updateVisibility, {
        id: setId,
        visibility: "unlisted",
      }),
    );
    await unwrap(await member.mutation(api.sharing.addToLibrary, { setId }));

    await unwrap(
      await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
        userId: TEST_USER.tokenIdentifier,
        targetSetId: setId,
        fieldDefinitions: fieldDefs,
        cards: makeCards(1),
      }),
    );

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    const appendedCard = cards[cards.length - 1]!;
    const srsCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("srsCards")
        .withIndex("by_cardId", (q) => q.eq("cardId", appendedCard._id))
        .take(10);
    });

    expect(srsCards.map((card) => card.userId).sort()).toEqual([
      TEST_USER.tokenIdentifier,
      OTHER_USER.tokenIdentifier,
    ]);
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

describe("appendGeneratedCardsForTool metadata", () => {
  it("updates updatedAt when generated cards are appended", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(setId, { updatedAt: 1 });
    });

    await unwrap(await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
    }));

    const set = await unwrap(await as.query(api.flashcardSets.get, { id: setId }));
    expect(set.updatedAt).toBeGreaterThan(1);
  });

  it("keeps generated set origin when appending generated cards", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const created = await unwrap(await t.mutation(internal.tooling.createGeneratedSetForTool, {
      userId: TEST_USER.tokenIdentifier,
      name: "Generated",
      sourceSetIds: [],
      sourceScope: "custom",
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
      addToSrs: false,
    }));

    await unwrap(await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: created.setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
    }));

    const set = await unwrap(await as.query(api.flashcardSets.get, { id: created.setId }));
    expect(set.origin.kind).toBe("ai_generated");
  });
});

describe("appendGeneratedCardsForTool SRS enrollment", () => {
  it("skips members with SRS disabled when appending generated cards", async () => {
    const t = convexTest(schema, modules);
    const { setId, as } = await createSetWithCards(t, { cardCount: 1 });
    const member = t.withIdentity(OTHER_USER);

    await unwrap(await as.mutation(api.flashcardSets.updateVisibility, {
      id: setId,
      visibility: "unlisted",
    }));
    await unwrap(await member.mutation(api.sharing.addToLibrary, { setId }));
    await unwrap(await member.mutation(api.userSets.disableSrs, { setId }));

    await unwrap(await t.mutation(internal.tooling.appendGeneratedCardsForTool, {
      userId: TEST_USER.tokenIdentifier,
      targetSetId: setId,
      fieldDefinitions: fieldDefs,
      cards: makeCards(1),
    }));

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    const appendedCard = cards[cards.length - 1]!;
    const userIds = (await getSrsCardsForCard(t, appendedCard._id))
      .map((card) => card.userId)
      .sort();
    expect(userIds).toEqual([TEST_USER.tokenIdentifier]);
  });
});
