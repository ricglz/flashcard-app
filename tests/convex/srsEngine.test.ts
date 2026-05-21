import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { TestDb } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");


async function setupSrsSet(
  t: TestDb,
  cardCount = 3,
  name = "Test Set"
) {
  const as = t.withIdentity(TEST_USER);

  const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
    name,
    fieldDefinitions: fieldDefs,
  }));

  const cards = Array.from({ length: cardCount }, (_, i) => ({
    fields: { Front: `Q${i}`, Back: `A${i}` },
    order: i,
  }));
  if (cards.length > 0) {
    await unwrap(await as.mutation(api.flashcards.batchCreate, { setId, cards }));
  }

  return { setId, as };
}

async function getQueueLength(t: TestDb) {
  return (await getQueueItems(t)).length;
}

async function getQueueItems(t: TestDb) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) =>
        q.eq("userId", TEST_USER.tokenIdentifier)
      )
      .take(500);
  });
}

async function getSrsCards(t: TestDb) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("srsCards")
      .withIndex("by_userId_and_nextReviewAt", (q) =>
        q.eq("userId", TEST_USER.tokenIdentifier)
      )
      .take(500);
  });
}

async function populateForTestUser(t: TestDb) {
  await t.mutation(internal.srsEngine.populateQueueForUser, {
    userId: TEST_USER.tokenIdentifier,
  });
}

async function insertDueReviewCard(
  t: TestDb,
  args: {
    setId: Id<"flashcardSets">;
    cardId: Id<"flashcards">;
    nextReviewAt?: number;
  }
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("srsCards", {
      userId: TEST_USER.tokenIdentifier,
      cardId: args.cardId,
      setId: args.setId,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 2,
      nextReviewAt: args.nextReviewAt ?? new Date("2025-06-14T00:00:00Z").getTime(),
      status: "review",
    });
  });
}

function uniqueValues<T>(values: T[]) {
  return new Set(values).size;
}

describe("populateQueueForUser respects dayResetUtcHour", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds new cards when current UTC hour matches the user's reset hour", async () => {
    vi.setSystemTime(new Date("2025-06-15T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 8, dailyGoal: 0 });

    await populateForTestUser(t);

    const count = await getQueueLength(t);
    expect(count).toBeGreaterThan(0);
  });

  it("does NOT add new cards when current UTC hour differs from reset hour", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 8, dailyGoal: 0 });

    await populateForTestUser(t);

    const count = await getQueueLength(t);
    expect(count).toBe(0);
  });

  it("uses default reset hour (4 UTC) when no setting exists", async () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:00Z"));
    const t = convexTest(schema, modules);
    await setupSrsSet(t);

    await populateForTestUser(t);

    const count = await getQueueLength(t);
    expect(count).toBeGreaterThan(0);
  });

  it("still adds due review cards outside the reset hour", async () => {
    vi.setSystemTime(new Date("2025-06-15T14:00:00Z"));
    const t = convexTest(schema, modules);
    const { setId, as } = await setupSrsSet(t, 1);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 8, dailyGoal: 0 });

    const cardList = await as.query(api.flashcards.list, { setId });

    await insertDueReviewCard(t, { setId, cardId: cardList[0]!._id });

    await populateForTestUser(t);

    const count = await getQueueLength(t);
    expect(count).toBe(1);
  });
});

describe("populateQueueForUser queue population edge cases", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not queue or enroll cards for an empty enabled set", async () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:00Z"));
    const t = convexTest(schema, modules);

    await setupSrsSet(t, 0);
    await populateForTestUser(t);

    expect(await getQueueItems(t)).toEqual([]);
    expect(await getSrsCards(t)).toEqual([]);
  });

  it("does not create duplicate queue entries when run repeatedly with an existing queue", async () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:00Z"));
    const t = convexTest(schema, modules);

    await setupSrsSet(t, 4);
    await populateForTestUser(t);
    const firstQueue = await getQueueItems(t);

    await populateForTestUser(t);
    const secondQueue = await getQueueItems(t);

    expect(secondQueue).toHaveLength(firstQueue.length);
    expect(new Set(secondQueue.map((item) => item._id))).toEqual(
      new Set(firstQueue.map((item) => item._id))
    );
    expect(uniqueValues(secondQueue.map((item) => item.srsCardId))).toBe(
      secondQueue.length
    );
  });

  it("keeps carry-over queue items and appends newly queued cards after existing order", async () => {
    vi.setSystemTime(new Date("2025-06-15T14:00:00Z"));
    const t = convexTest(schema, modules);
    const { setId, as } = await setupSrsSet(t, 2);
    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 8, dailyGoal: 0 });
    const cardList = await as.query(api.flashcards.list, { setId });
    const firstSrsCardId = await insertDueReviewCard(t, {
      setId,
      cardId: cardList[0]!._id,
    });
    const secondSrsCardId = await insertDueReviewCard(t, {
      setId,
      cardId: cardList[1]!._id,
    });

    await t.run(async (ctx) => {
      const firstSrsCard = await ctx.db.get(firstSrsCardId);
      if (!firstSrsCard) throw new Error("Missing test SRS card");
      await ctx.db.insert("reviewQueue", {
        userId: TEST_USER.tokenIdentifier,
        cardId: firstSrsCard.cardId,
        srsCardId: firstSrsCardId,
        setId: firstSrsCard.setId,
        queuedAt: new Date("2025-06-15T12:00:00Z").getTime(),
        order: 7,
      });
    });

    await populateForTestUser(t);
    const queue = await getQueueItems(t);

    expect(queue).toHaveLength(2);
    expect(queue.map((item) => item.srsCardId)).toEqual([
      firstSrsCardId,
      secondSrsCardId,
    ]);
    expect(queue.map((item) => item.order)).toEqual([7, 8]);
  });

  it("does not add more new cards after queued new cards exhaust the daily limit", async () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t, 5);
    await as.mutation(api.userSettings.updateSrsSettings, {
      dayResetUtcHour: 4,
      maxNewCardsPerDay: 2,
      dailyGoal: 0,
    });

    await populateForTestUser(t);
    const firstQueue = await getQueueItems(t);
    expect(firstQueue).toHaveLength(2);

    await populateForTestUser(t);
    const secondQueue = await getQueueItems(t);
    const srsCards = await getSrsCards(t);
    const queuedSrsCards = new Map(
      secondQueue.map((item) => [item.srsCardId, item])
    );
    const queuedNewSrsCards = srsCards.filter(
      (card) => card.status === "new" && queuedSrsCards.has(card._id)
    );

    expect(secondQueue).toHaveLength(2);
    expect(new Set(secondQueue.map((item) => item._id))).toEqual(
      new Set(firstQueue.map((item) => item._id))
    );
    expect(queuedNewSrsCards).toHaveLength(2);
  });

  it("draws limited new cards from multiple enabled sets", async () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:00Z"));
    const t = convexTest(schema, modules);

    const first = await setupSrsSet(t, 4, "First Set");
    const second = await setupSrsSet(t, 4, "Second Set");
    await first.as.mutation(api.userSettings.updateSrsSettings, {
      dayResetUtcHour: 4,
      maxNewCardsPerDay: 3,
      dailyGoal: 0,
    });

    await populateForTestUser(t);
    const queue = await getQueueItems(t);
    const queuedSetIds = new Set(queue.map((item) => item.setId));

    expect(queue).toHaveLength(3);
    expect(queuedSetIds.has(first.setId)).toBe(true);
    expect(queuedSetIds.has(second.setId)).toBe(true);
  });
});
