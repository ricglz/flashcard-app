/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

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

  const setId = await as.mutation(api.flashcardSets.create, {
    name: "Test",
    fieldDefinitions: fieldDefs,
  });

  const cards = Array.from({ length: reviewTimestamps.length }, (_, i) => ({
    fields: { Front: `Q${i}`, Back: `A${i}` },
    order: i,
  }));
  await as.mutation(api.flashcards.batchCreate, { setId, cards });

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
