import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { TestDb } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");


async function setupSetWithSrsReviews(
  t: TestDb,
  reviewTimestamps: number[]
) {
  const as = t.withIdentity(TEST_USER);

  const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
    name: "Test",
    fieldDefinitions: fieldDefs,
  }));

  const cards = Array.from({ length: reviewTimestamps.length }, (_, i) => ({
    fields: { Front: `Q${i}`, Back: `A${i}` },
    order: i,
  }));
  await unwrap(await as.mutation(api.flashcards.batchCreate, { setId, cards }));

  const cardList = await as.query(api.flashcards.list, { setId });

  for (let i = 0; i < reviewTimestamps.length; i++) {
    await t.run(async (ctx) => {
      const srsCardId = await ctx.db.insert("srsCards", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[i]!._id,
        setId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewAt: 0,
        status: "learning",
      });

      await ctx.db.insert("srsReviews", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[i]!._id,
        srsCardId,
        rating: "good",
        timestamp: reviewTimestamps[i]!,
        newInterval: 1,
        newEaseFactor: 2.5,
      });
    });
  }

  return { setId, as };
}

describe("getHydratedQueue", () => {
  it("returns hydrated items with correct fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test Set",
      fieldDefinitions: fieldDefs,
    }));

    const cards = [
      { fields: { Front: "Q0", Back: "A0" }, order: 0 },
      { fields: { Front: "Q1", Back: "A1" }, order: 1 },
      { fields: { Front: "Q2", Back: "A2" }, order: 2 },
    ];
    await as.mutation(api.flashcards.batchCreate, { setId, cards });
    const cardList = await as.query(api.flashcards.list, { setId });

    await t.run(async (ctx) => {
      for (let i = 0; i < cardList.length; i++) {
        const srsCardId = await ctx.db.insert("srsCards", {
          userId: TEST_USER.tokenIdentifier,
          cardId: cardList[i]!._id,
          setId,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 1,
          nextReviewAt: 0,
          status: "learning",
        });

        await ctx.db.insert("reviewQueue", {
          userId: TEST_USER.tokenIdentifier,
          cardId: cardList[i]!._id,
          srsCardId,
          setId,
          queuedAt: Date.now(),
          order: i,
        });
      }
    });

    const queue = await as.query(api.srsReviewQueue.getHydratedQueue);
    expect(queue).toHaveLength(3);

    expect(queue[0]!.card.fields).toEqual({ Front: "Q0", Back: "A0" });
    expect(queue[0]!.fieldDefinitions).toHaveLength(2);
    expect(queue[0]!.fieldDefinitions[0]!.name).toBe("Front");
    expect(queue[0]!.frontFields).toEqual(["Front"]);
    expect(queue[0]!.backFields).toEqual(["Back"]);
    expect(queue[0]!.srsCardId).toBeDefined();
  });

  it("returns empty array when queue is empty", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const queue = await as.query(api.srsReviewQueue.getHydratedQueue);
    expect(queue).toEqual([]);
  });

  it("hydrates only queued cards from a larger set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Large Set",
      fieldDefinitions: fieldDefs,
    }));

    await as.mutation(api.flashcards.batchCreate, {
      setId,
      cards: [
        { fields: { Front: "Queued", Back: "Included" }, order: 0 },
        { fields: { Front: "Unqueued", Back: "Excluded" }, order: 1 },
      ],
    });
    const cardList = await as.query(api.flashcards.list, { setId });

    await t.run(async (ctx) => {
      const srsCardId = await ctx.db.insert("srsCards", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[0]!._id,
        setId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewAt: 0,
        status: "learning",
      });

      await ctx.db.insert("reviewQueue", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[0]!._id,
        srsCardId,
        setId,
        queuedAt: Date.now(),
        order: 0,
      });
    });

    const queue = await as.query(api.srsReviewQueue.getHydratedQueue);

    expect(queue).toHaveLength(1);
    expect(queue[0]!.card.fields).toEqual({ Front: "Queued", Back: "Included" });
  });
});

describe("getQueueStats", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts reviewedToday using default day boundary", async () => {
    // Current time: 2025-06-15 10:00 UTC, default reset hour = 4
    // Day boundary: 2025-06-15 04:00 UTC
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);

    const beforeBoundary = new Date("2025-06-15T03:00:00Z").getTime();
    const afterBoundary = new Date("2025-06-15T05:00:00Z").getTime();
    const afterBoundary2 = new Date("2025-06-15T09:00:00Z").getTime();

    await setupSetWithSrsReviews(t, [
      beforeBoundary,
      afterBoundary,
      afterBoundary2,
    ]);

    const as = t.withIdentity(TEST_USER);
    const stats = await as.query(api.srsReviewQueue.getQueueStats);

    expect(stats?.reviewedToday).toBe(2);
  });

  it("counts reviewedToday after more than 500 older reviews", async () => {
    // Current time: 2025-06-15 10:00 UTC, default reset hour = 4
    // Day boundary: 2025-06-15 04:00 UTC
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);

    const beforeBoundary = new Date("2025-06-15T03:00:00Z").getTime();
    const afterBoundary = new Date("2025-06-15T05:00:00Z").getTime();
    const afterBoundary2 = new Date("2025-06-15T09:00:00Z").getTime();

    await setupSetWithSrsReviews(t, [
      ...Array.from({ length: 501 }, () => beforeBoundary),
      afterBoundary,
      afterBoundary2,
    ]);

    const as = t.withIdentity(TEST_USER);
    const stats = await as.query(api.srsReviewQueue.getQueueStats);

    expect(stats?.reviewedToday).toBe(2);
  });

  it("counts reviewedToday using custom day boundary", async () => {
    // Current time: 2025-06-15 10:00 UTC, custom reset hour = 8
    // Day boundary: 2025-06-15 08:00 UTC
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);

    const as = t.withIdentity(TEST_USER);
    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 8, dailyGoal: 0 });

    const beforeBoundary = new Date("2025-06-15T07:00:00Z").getTime();
    const afterBoundary = new Date("2025-06-15T09:00:00Z").getTime();

    await setupSetWithSrsReviews(t, [beforeBoundary, afterBoundary]);

    const stats = await as.query(api.srsReviewQueue.getQueueStats);

    expect(stats?.reviewedToday).toBe(1);
  });

  it("returns dayResetUtcHour in response", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 12, dailyGoal: 0 });

    const stats = await as.query(api.srsReviewQueue.getQueueStats);
    expect(stats?.dayResetUtcHour).toBe(12);
  });
});

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function setupQueuedReview(t: TestDb, user = TEST_USER) {
  const as = t.withIdentity(user);
  const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
    name: `Review Set ${user.tokenIdentifier}`,
    fieldDefinitions: fieldDefs,
  }));
  await unwrap(await as.mutation(api.flashcards.batchCreate, {
    setId,
    cards: [
      { fields: { Front: "Q0", Back: "A0" }, order: 0 },
      { fields: { Front: "Q1", Back: "A1" }, order: 1 },
    ],
  }));
  const cardList = await as.query(api.flashcards.list, { setId });
  const srsCardId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("srsCards", {
      userId: user.tokenIdentifier,
      cardId: cardList[0]!._id,
      setId,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 1,
      nextReviewAt: 0,
      status: "learning",
    });
    await ctx.db.insert("reviewQueue", {
      userId: user.tokenIdentifier,
      cardId: cardList[0]!._id,
      srsCardId: id,
      setId,
      queuedAt: Date.now(),
      order: 0,
    });
    return id;
  });

  return { as, setId, cardList, srsCardId };
}

async function getReviewRows(t: TestDb) {
  return await t.run(async (ctx) => {
    return await ctx.db.query("srsReviews").withIndex("by_userId", (q) =>
      q.eq("userId", TEST_USER.tokenIdentifier)
    ).take(500);
  });
}

async function getQueueRows(t: TestDb, userId = TEST_USER.tokenIdentifier) {
  return await t.run(async (ctx) => {
    return await ctx.db.query("reviewQueue").withIndex("by_userId_and_order", (q) =>
      q.eq("userId", userId)
    ).take(500);
  });
}

describe("recordReview", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a valid queued review and removes the queue item", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as, srsCardId } = await setupQueuedReview(t);

    const result = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });

    expect(result).toEqual({ ok: true, value: { outcome: "recorded" } });

    const srsCard = await t.run(async (ctx) => await ctx.db.get(srsCardId));
    expect(srsCard).toMatchObject({
      repetitions: 2,
      interval: 6,
      status: "review",
      lastReviewedAt: new Date("2025-06-15T10:00:00Z").getTime(),
    });
    expect(srsCard?.nextReviewAt).toBe(
      new Date("2025-06-21T10:00:00Z").getTime()
    );
    expect(await getReviewRows(t)).toHaveLength(1);
    expect(await getQueueRows(t)).toEqual([]);
  });

  it("treats replay after queue deletion as duplicate without another review", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as, srsCardId } = await setupQueuedReview(t);

    await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });
    const reviewedCard = await t.run(async (ctx) => await ctx.db.get(srsCardId));

    vi.setSystemTime(new Date("2025-06-15T11:00:00Z"));
    const duplicate = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "easy",
    });

    expect(duplicate).toEqual({ ok: true, value: { remaining: 0, outcome: "duplicate" } });
    expect(await getReviewRows(t)).toHaveLength(1);
    expect(await t.run(async (ctx) => await ctx.db.get(srsCardId))).toEqual(reviewedCard);
  });

  it("reports current remaining queue count for duplicate replay", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as, setId, cardList, srsCardId } = await setupQueuedReview(t);

    await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });
    await t.run(async (ctx) => {
      const otherSrsCardId = await ctx.db.insert("srsCards", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[1]!._id,
        setId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewAt: 0,
        status: "learning",
      });
      await ctx.db.insert("reviewQueue", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[1]!._id,
        srsCardId: otherSrsCardId,
        setId,
        queuedAt: Date.now(),
        order: 1,
      });
    });

    const duplicate = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });

    expect(duplicate).toEqual({ ok: true, value: { remaining: 1, outcome: "duplicate" } });
    expect(await getReviewRows(t)).toHaveLength(1);
  });

  it("rejects another user's SRS card without deleting queue or inserting review", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { srsCardId } = await setupQueuedReview(t, TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const result = await other.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { _tag: "NotFound", message: "SRS card not found" },
    });
    expect(await getReviewRows(t)).toEqual([]);
    expect(await getQueueRows(t)).toHaveLength(1);
  });

  it("rejects a foreign queue row for an owned SRS card", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as, setId, cardList } = await setupQueuedReview(t);
    await t.run(async (ctx) => {
      const existing = await ctx.db.query("reviewQueue").withIndex("by_userId_and_order", (q) =>
        q.eq("userId", TEST_USER.tokenIdentifier)
      ).take(100);
      for (const row of existing) await ctx.db.delete(row._id);
    });
    const srsCardId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("srsCards", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[1]!._id,
        setId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewAt: 0,
        status: "learning",
      });
      await ctx.db.insert("reviewQueue", {
        userId: OTHER_USER.tokenIdentifier,
        cardId: cardList[1]!._id,
        srsCardId: id,
        setId,
        queuedAt: Date.now(),
        order: 0,
      });
      return id;
    });

    const result = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { _tag: "NotFound", message: "Review queue item not found" },
    });
    expect(await getReviewRows(t)).toEqual([]);
    expect(await getQueueRows(t, OTHER_USER.tokenIdentifier)).toHaveLength(1);
  });

  it("rejects a stale mismatched queue row without scheduling or inserting review", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as, setId, cardList, srsCardId } = await setupQueuedReview(t);
    const originalSrsCard = await t.run(async (ctx) => await ctx.db.get(srsCardId));

    await t.run(async (ctx) => {
      const queue = await ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) =>
        q.eq("srsCardId", srsCardId)
      ).first();
      if (!queue) throw new Error("Missing test queue item");
      await ctx.db.patch(queue._id, { cardId: cardList[1]!._id, setId });
    });

    const result = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { _tag: "NotFound", message: "Review queue item not found" },
    });
    expect(await t.run(async (ctx) => await ctx.db.get(srsCardId))).toEqual(originalSrsCard);
    expect(await getReviewRows(t)).toEqual([]);
    expect(await getQueueRows(t)).toHaveLength(1);
  });
});
