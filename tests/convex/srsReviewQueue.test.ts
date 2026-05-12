/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");


async function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } } | T): Promise<T> {
  if (result && typeof result === "object" && "ok" in result && result.ok === false) {
    throw new Error(result.error.message);
  }
  return result as T;
}

const TEST_USER = {
  tokenIdentifier: "test-user-1",
  subject: "user1",
};

const fieldDefs = [
  { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
  { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
];

async function setupSetWithSrsReviews(
  t: ReturnType<typeof convexTest>,
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
        cardId: cardList[i]._id,
        setId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewAt: 0,
        status: "learning",
      });

      await ctx.db.insert("srsReviews", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[i]._id,
        srsCardId,
        rating: "good",
        timestamp: reviewTimestamps[i],
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
          cardId: cardList[i]._id,
          setId,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 1,
          nextReviewAt: 0,
          status: "learning",
        });

        await ctx.db.insert("reviewQueue", {
          userId: TEST_USER.tokenIdentifier,
          cardId: cardList[i]._id,
          srsCardId,
          setId,
          queuedAt: Date.now(),
          order: i,
        });
      }
    });

    const queue = await as.query(api.srsReviewQueue.getHydratedQueue);
    expect(queue).toHaveLength(3);

    expect(queue[0].card.fields).toEqual({ Front: "Q0", Back: "A0" });
    expect(queue[0].fieldDefinitions).toHaveLength(2);
    expect(queue[0].fieldDefinitions[0].name).toBe("Front");
    expect(queue[0].frontFields).toEqual(["Front"]);
    expect(queue[0].backFields).toEqual(["Back"]);
    expect(queue[0].srsCardId).toBeDefined();
  });

  it("returns empty array when queue is empty", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const queue = await as.query(api.srsReviewQueue.getHydratedQueue);
    expect(queue).toEqual([]);
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
    await as.mutation(api.userSettings.update, { dayResetUtcHour: 8 });

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

    await as.mutation(api.userSettings.update, { dayResetUtcHour: 12 });

    const stats = await as.query(api.srsReviewQueue.getQueueStats);
    expect(stats?.dayResetUtcHour).toBe(12);
  });
});
