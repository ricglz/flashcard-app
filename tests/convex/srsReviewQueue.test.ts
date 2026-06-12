import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  createSetWithCards,
  createTestDb,
  insertQueuedSrsCardForTest,
  insertSrsReviewForTest,
  TEST_USER,
  unwrap,
} from "./helpers";
import type { TestDb } from "./testTypes";


async function setupSetWithSrsReviews(
  t: TestDb,
  reviewTimestamps: number[]
) {
  const as = t.withIdentity(TEST_USER);
  const { setId, cards: cardList } = await createSetWithCards(as, {
    cardCount: reviewTimestamps.length,
    cards: reviewTimestamps.map((_, index) => ({
      fields: { Front: `Q${index}`, Back: `A${index}` },
      order: index,
    })),
  });

  for (let i = 0; i < reviewTimestamps.length; i++) {
    await t.run(async (ctx) => {
      const srsCardId = await insertQueuedSrsCardForTest(ctx, {
        cardId: cardList[i]!._id,
        setId,
      });
      await insertSrsReviewForTest(ctx, {
        cardId: cardList[i]!._id,
        srsCardId,
        timestamp: reviewTimestamps[i]!,
      });
    });
  }

  return { setId, as };
}

describe("getHydratedQueue", () => {
  it("returns hydrated items with correct fields", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    const { cards: cardList, setId } = await createSetWithCards(as, {
      name: "Test Set",
      cards: [
        { fields: { Front: "Q0", Back: "A0" }, order: 0 },
        { fields: { Front: "Q1", Back: "A1" }, order: 1 },
        { fields: { Front: "Q2", Back: "A2" }, order: 2 },
      ],
    });

    await t.run(async (ctx) => {
      for (let i = 0; i < cardList.length; i++) {
        await insertQueuedSrsCardForTest(ctx, {
          cardId: cardList[i]!._id,
          setId,
          order: i,
        });
      }
    });

    const queue = await unwrap(await as.query(api.srsReviewQueue.getHydratedQueue));
    expect(queue).toHaveLength(3);

    expect(queue[0]!.card.fields).toEqual({ Front: "Q0", Back: "A0" });
    expect(queue[0]!.fieldDefinitions).toHaveLength(2);
    expect(queue[0]!.fieldDefinitions[0]!.name).toBe("Front");
    expect(queue[0]!.frontFields).toEqual(["Front"]);
    expect(queue[0]!.backFields).toEqual(["Back"]);
    expect(queue[0]!.srsCardId).toBeDefined();
  });

  it("returns empty array when queue is empty", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    const queue = await unwrap(await as.query(api.srsReviewQueue.getHydratedQueue));
    expect(queue).toEqual([]);
  });

  it("hydrates only queued cards from a larger set", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    const { setId, cards: cardList } = await createSetWithCards(as, {
      name: "Large Set",
      cards: [
        { fields: { Front: "Queued", Back: "Included" }, order: 0 },
        { fields: { Front: "Unqueued", Back: "Excluded" }, order: 1 },
      ],
    });

    await t.run(async (ctx) => {
      await insertQueuedSrsCardForTest(ctx, {
        cardId: cardList[0]!._id,
        setId,
      });
    });

    const queue = await unwrap(await as.query(api.srsReviewQueue.getHydratedQueue));

    expect(queue).toHaveLength(1);
    expect(queue[0]!.card.fields).toEqual({ Front: "Queued", Back: "Included" });
  });
});

describe("recordReview timestamps", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records replayed reviews using the supplied review timestamp", async () => {
    vi.setSystemTime(new Date("2025-06-16T10:00:00Z"));
    const t = createTestDb();
    const { as, srsCardId } = await setupQueuedReview(t);
    const reviewedAt = new Date("2025-06-15T10:00:00Z").getTime();

    const result = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
      reviewedAt,
    });

    expect(result).toEqual({ ok: true, value: { outcome: "recorded" } });
    const srsCard = await t.run(async (ctx) => await ctx.db.get(srsCardId));
    expect(srsCard?.lastReviewedAt).toBe(reviewedAt);
    expect(srsCard?.nextReviewAt).toBe(new Date("2025-06-21T10:00:00Z").getTime());
    expect(await getReviewRows(t)).toMatchObject([{ timestamp: reviewedAt }]);
    expect(await getDailyStatsRows(t)).toMatchObject([
      {
        dayKey: "2025-06-15",
        dayStartMs: new Date("2025-06-15T04:00:00Z").getTime(),
        srsReviewCount: 1,
      },
    ]);
  });

  it("clamps future review timestamps to server receipt time", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = createTestDb();
    const { as, srsCardId } = await setupQueuedReview(t);
    const serverNow = Date.now();

    const result = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
      reviewedAt: new Date("2025-06-16T10:00:00Z").getTime(),
    });

    expect(result).toEqual({ ok: true, value: { outcome: "recorded" } });
    const srsCard = await t.run(async (ctx) => await ctx.db.get(srsCardId));
    expect(srsCard?.lastReviewedAt).toBe(serverNow);
    expect(await getReviewRows(t)).toMatchObject([{ timestamp: serverNow }]);
  });

  it("rejects invalid review timestamps", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = createTestDb();
    const { as, srsCardId } = await setupQueuedReview(t);

    const result = await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
      reviewedAt: -1,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { _tag: "InvalidInput" },
    });
    expect(await getReviewRows(t)).toEqual([]);
  });
});

describe("getReviewSession", () => {
  it("returns stats and hydrated queue items", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    const { cards: cardList, setId } = await createSetWithCards(as, {
      name: "Review Session Set",
      cards: [
        { fields: { Front: "Q0", Back: "A0" }, order: 0 },
        { fields: { Front: "Q1", Back: "A1" }, order: 1 },
      ],
    });

    await t.run(async (ctx) => {
      for (let i = 0; i < cardList.length; i++) {
        await insertQueuedSrsCardForTest(ctx, {
          cardId: cardList[i]!._id,
          setId,
          order: i,
        });
      }
    });

    const session = await unwrap(await as.query(api.srsReviewQueue.getReviewSession, {}));

    expect(session.stats).toMatchObject({
      remaining: 2,
      reviewedToday: 0,
      batchSize: 50,
    });
    expect(session.queue).toHaveLength(2);
    expect(session.queue[0]).toMatchObject({
      setName: "Review Session Set",
      frontFields: ["Front"],
      backFields: ["Back"],
      annotation: null,
    });
    expect(session.queue[0]!.card.fields).toEqual({ Front: "Q0", Back: "A0" });
  });

  it("limits default hydrated queue to 50 cards", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const { cards: cardList, setId } = await createSetWithCards(as, {
      cardCount: 60,
    });

    await t.run(async (ctx) => {
      for (let i = 0; i < cardList.length; i++) {
        await insertQueuedSrsCardForTest(ctx, {
          cardId: cardList[i]!._id,
          setId,
          order: i,
        });
      }
    });

    const session = await unwrap(await as.query(api.srsReviewQueue.getReviewSession, {}));

    expect(session.stats.remaining).toBe(60);
    expect(session.stats.batchSize).toBe(50);
    expect(session.queue).toHaveLength(50);
  });

  it("clamps custom batch size to 100 cards", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const { cards: cardList, setId } = await createSetWithCards(as, {
      cardCount: 120,
    });

    await t.run(async (ctx) => {
      for (let i = 0; i < cardList.length; i++) {
        await insertQueuedSrsCardForTest(ctx, {
          cardId: cardList[i]!._id,
          setId,
          order: i,
        });
      }
    });

    const session = await unwrap(await as.query(api.srsReviewQueue.getReviewSession, {
      batchSize: 500,
    }));

    expect(session.stats.remaining).toBe(120);
    expect(session.stats.batchSize).toBe(100);
    expect(session.queue).toHaveLength(100);
  });

  it("returns annotations only for hydrated queued cards", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const { cards: cardList, setId } = await createSetWithCards(as, {
      cards: [
        { fields: { Front: "Q0", Back: "A0" }, order: 0 },
        { fields: { Front: "Q1", Back: "A1" }, order: 1 },
        { fields: { Front: "Q2", Back: "A2" }, order: 2 },
      ],
    });

    await t.run(async (ctx) => {
      await insertQueuedSrsCardForTest(ctx, {
        cardId: cardList[0]!._id,
        setId,
        order: 0,
      });
      await insertQueuedSrsCardForTest(ctx, {
        cardId: cardList[1]!._id,
        setId,
        order: 1,
      });
      await ctx.db.insert("cardAnnotations", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[0]!._id,
        setId,
        flagged: true,
        note: "Hydrated note",
      });
      await ctx.db.insert("cardAnnotations", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[1]!._id,
        setId,
        flagged: true,
        note: "Queued but not hydrated",
      });
      await ctx.db.insert("cardAnnotations", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[2]!._id,
        setId,
        flagged: true,
        note: "Unqueued note",
      });
    });

    const session = await unwrap(await as.query(api.srsReviewQueue.getReviewSession, {
      batchSize: 1,
    }));

    expect(session.queue).toHaveLength(1);
    expect(session.queue[0]!.annotation).toEqual({
      flagged: true,
      note: "Hydrated note",
    });
    expect(session.queue.map((item) => item.annotation?.note)).not.toContain(
      "Queued but not hydrated",
    );
    expect(session.queue.map((item) => item.annotation?.note)).not.toContain(
      "Unqueued note",
    );
  });

  it("returns an unauthenticated failure when unauthenticated", async () => {
    const t = createTestDb();

    const session = await t.query(api.srsReviewQueue.getReviewSession, {});

    expect(session).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
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
    const t = createTestDb();

    const beforeBoundary = new Date("2025-06-15T03:00:00Z").getTime();
    const afterBoundary = new Date("2025-06-15T05:00:00Z").getTime();
    const afterBoundary2 = new Date("2025-06-15T09:00:00Z").getTime();

    await setupSetWithSrsReviews(t, [
      beforeBoundary,
      afterBoundary,
      afterBoundary2,
    ]);

    const as = t.withIdentity(TEST_USER);
    const stats = await unwrap(await as.query(api.srsReviewQueue.getQueueStats));

    expect(stats.reviewedToday).toBe(2);
  });

  it("counts reviewedToday after more than 500 older reviews", async () => {
    // Current time: 2025-06-15 10:00 UTC, default reset hour = 4
    // Day boundary: 2025-06-15 04:00 UTC
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = createTestDb();

    const beforeBoundary = new Date("2025-06-15T03:00:00Z").getTime();
    const afterBoundary = new Date("2025-06-15T05:00:00Z").getTime();
    const afterBoundary2 = new Date("2025-06-15T09:00:00Z").getTime();

    await setupSetWithSrsReviews(t, [
      ...Array.from({ length: 501 }, () => beforeBoundary),
      afterBoundary,
      afterBoundary2,
    ]);

    const as = t.withIdentity(TEST_USER);
    const stats = await unwrap(await as.query(api.srsReviewQueue.getQueueStats));

    expect(stats.reviewedToday).toBe(2);
  });

  it("counts reviewedToday using custom day boundary", async () => {
    // Current time: 2025-06-15 10:00 UTC, custom reset hour = 8
    // Day boundary: 2025-06-15 08:00 UTC
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = createTestDb();

    const as = t.withIdentity(TEST_USER);
    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 8, dailyGoal: 0 });

    const beforeBoundary = new Date("2025-06-15T07:00:00Z").getTime();
    const afterBoundary = new Date("2025-06-15T09:00:00Z").getTime();

    await setupSetWithSrsReviews(t, [beforeBoundary, afterBoundary]);

    const stats = await unwrap(await as.query(api.srsReviewQueue.getQueueStats));

    expect(stats.reviewedToday).toBe(1);
  });

  it("returns dayResetUtcHour in response", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 12, dailyGoal: 0 });

    const stats = await unwrap(await as.query(api.srsReviewQueue.getQueueStats));
    expect(stats.dayResetUtcHour).toBe(12);
  });
});

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function setupQueuedReview(t: TestDb, user = TEST_USER) {
  const as = t.withIdentity(user);
  const { setId, cards: cardList } = await createSetWithCards(as, {
    name: `Review Set ${user.tokenIdentifier}`,
    cards: [
      { fields: { Front: "Q0", Back: "A0" }, order: 0 },
      { fields: { Front: "Q1", Back: "A1" }, order: 1 },
    ],
  });
  const srsCardId = await t.run(async (ctx) => {
    return await insertQueuedSrsCardForTest(ctx, {
      userId: user.tokenIdentifier,
      cardId: cardList[0]!._id,
      setId,
    });
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

async function getDailyStatsRows(t: TestDb) {
  return await t.run(async (ctx) => {
    return await ctx.db.query("dailyStats").withIndex("by_userId_and_dayStartMs", (q) =>
      q.eq("userId", TEST_USER.tokenIdentifier)
    ).take(500);
  });
}

describe("recordReview", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a valid queued review and removes the queue item", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = createTestDb();
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
    const t = createTestDb();
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
    const t = createTestDb();
    const { as, setId, cardList, srsCardId } = await setupQueuedReview(t);

    await as.mutation(api.srsReviewQueue.recordReview, {
      srsCardId,
      rating: "good",
    });
    await t.run(async (ctx) => {
      await insertQueuedSrsCardForTest(ctx, {
        cardId: cardList[1]!._id,
        setId,
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
    const t = createTestDb();
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
    const t = createTestDb();
    const { as, setId, cardList } = await setupQueuedReview(t);
    await t.run(async (ctx) => {
      const existing = await ctx.db.query("reviewQueue").withIndex("by_userId_and_order", (q) =>
        q.eq("userId", TEST_USER.tokenIdentifier)
      ).take(100);
      for (const row of existing) await ctx.db.delete(row._id);
    });
    const srsCardId = await t.run(async (ctx) => {
      return await insertQueuedSrsCardForTest(ctx, {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[1]!._id,
        setId,
        order: 0,
        srsOverrides: {},
      });
    });

    await t.run(async (ctx) => {
      const queue = await ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) =>
        q.eq("srsCardId", srsCardId)
      ).first();
      if (!queue) throw new Error("Missing test queue item");
      await ctx.db.patch(queue._id, { userId: OTHER_USER.tokenIdentifier });
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
    const t = createTestDb();
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
