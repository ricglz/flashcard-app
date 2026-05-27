import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  createSetWithCards,
  createTestDb,
  fieldDefs,
  TEST_USER,
  unwrap,
} from "./helpers";
import type { TestDb, TestIdentity } from "./testTypes";

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function getUserSet(
  t: TestDb,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", userId).eq("setId", setId),
      )
      .first();
  });
}

async function getSrsCards(
  t: TestDb,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("srsCards")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", userId).eq("setId", setId),
      )
      .take(100);
  });
}

async function getQueueRowsForSrsCardIds(
  t: TestDb,
  srsCardIds: Id<"srsCards">[],
) {
  return await t.run(async (ctx) => {
    const rows: Doc<"reviewQueue">[] = [];
    for (const srsCardId of srsCardIds) {
      const matches = await ctx.db
        .query("reviewQueue")
        .withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCardId))
        .take(10);
      rows.push(...matches);
    }
    return rows;
  });
}

async function createEmptySet(as: TestIdentity) {
  return await unwrap(
    await as.mutation(api.flashcardSets.create, {
      name: "SRS Commands",
      fieldDefinitions: fieldDefs,
    }),
  );
}

describe("userSets SRS enrollment commands", () => {
  it("enables SRS and enrolls cards when transitioning from disabled to enabled", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createEmptySet(as);

    await unwrap(await as.mutation(api.userSets.disableSrs, { setId }));
    await unwrap(
      await as.mutation(api.flashcards.batchCreate, {
        setId,
        cards: [
          { fields: { Front: "Q1", Back: "A1" }, order: 0 },
          { fields: { Front: "Q2", Back: "A2" }, order: 1 },
        ],
      }),
    );
    expect(await getSrsCards(t, TEST_USER.tokenIdentifier, setId)).toHaveLength(0);

    const result = await as.mutation(api.userSets.enableSrs, { setId });

    expect(result).toEqual({ ok: true, value: null });
    await expect(getUserSet(t, TEST_USER.tokenIdentifier, setId)).resolves.toMatchObject({
      srsEnabled: true,
    });
    const srsCards = await getSrsCards(t, TEST_USER.tokenIdentifier, setId);
    expect(srsCards).toHaveLength(2);
    expect(new Set(srsCards.map((card) => card.cardId)).size).toBe(2);
  });

  it("does not duplicate SRS cards when enableSrs is called repeatedly", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const { setId } = await createSetWithCards(as, { cardCount: 2 });
    const originalSrsCards = await getSrsCards(t, TEST_USER.tokenIdentifier, setId);
    const originalIds = originalSrsCards.map((card) => card._id).sort();

    expect(await as.mutation(api.userSets.enableSrs, { setId })).toEqual({
      ok: true,
      value: null,
    });
    expect(await as.mutation(api.userSets.enableSrs, { setId })).toEqual({
      ok: true,
      value: null,
    });

    const srsCards = await getSrsCards(t, TEST_USER.tokenIdentifier, setId);
    expect(srsCards).toHaveLength(2);
    expect(srsCards.map((card) => card._id).sort()).toEqual(originalIds);
  });

  it("disables SRS without deleting existing SRS cards or queue rows", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const { setId } = await createSetWithCards(as, { cardCount: 2 });
    const originalSrsCards = await getSrsCards(t, TEST_USER.tokenIdentifier, setId);
    const queuedCard = originalSrsCards[0]!;

    await t.run(async (ctx) => {
      await ctx.db.insert("reviewQueue", {
        userId: TEST_USER.tokenIdentifier,
        cardId: queuedCard.cardId,
        srsCardId: queuedCard._id,
        setId,
        queuedAt: Date.now(),
        order: 0,
      });
    });

    expect(await as.mutation(api.userSets.disableSrs, { setId })).toEqual({
      ok: true,
      value: null,
    });
    await expect(getUserSet(t, TEST_USER.tokenIdentifier, setId)).resolves.toMatchObject({
      srsEnabled: false,
    });
    expect(await getSrsCards(t, TEST_USER.tokenIdentifier, setId)).toEqual(
      expect.arrayContaining(
        originalSrsCards.map((card) => expect.objectContaining({ _id: card._id })),
      ),
    );
    expect(await getQueueRowsForSrsCardIds(t, [queuedCard._id])).toHaveLength(1);

    expect(await as.mutation(api.userSets.disableSrs, { setId })).toEqual({
      ok: true,
      value: null,
    });
    expect(await getSrsCards(t, TEST_USER.tokenIdentifier, setId)).toHaveLength(2);
    expect(await getQueueRowsForSrsCardIds(t, [queuedCard._id])).toHaveLength(1);
  });

  it("rejects non-members enabling or disabling SRS for another user's set", async () => {
    const t = createTestDb();
    const owner = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);
    const { setId } = await createSetWithCards(owner, { cardCount: 1 });

    expect(await other.mutation(api.userSets.enableSrs, { setId })).toMatchObject({
      ok: false,
      error: { _tag: "NotFound", message: "Set not found" },
    });
    expect(await other.mutation(api.userSets.disableSrs, { setId })).toMatchObject({
      ok: false,
      error: { _tag: "NotFound", message: "Set not found" },
    });
    await expect(getUserSet(t, TEST_USER.tokenIdentifier, setId)).resolves.toMatchObject({
      srsEnabled: true,
    });
  });

  it("rejects unauthenticated SRS enrollment command callers", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const { setId } = await createSetWithCards(as, { cardCount: 1 });

    expect(await t.mutation(api.userSets.enableSrs, { setId })).toMatchObject({
      ok: false,
      error: { _tag: "Unauthenticated" },
    });
    expect(await t.mutation(api.userSets.disableSrs, { setId })).toMatchObject({
      ok: false,
      error: { _tag: "Unauthenticated" },
    });
  });
});
