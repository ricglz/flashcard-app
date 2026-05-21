import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { TestDb } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");


async function setupSrsSet(t: TestDb, cardCount = 5) {
  const as = t.withIdentity(TEST_USER);

  const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
    name: "Test Set",
    fieldDefinitions: fieldDefs,
  }));

  const cards = Array.from({ length: cardCount }, (_, i) => ({
    fields: { Front: `Q${i}`, Back: `A${i}` },
    order: i,
  }));
  await unwrap(await as.mutation(api.flashcards.batchCreate, { setId, cards }));

  return { setId, as };
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

describe("forceRefreshQueue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds new cards when queue is empty", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t, 5);

    const result = await unwrap(await as.mutation(api.srsReviewQueue.forceRefreshQueue, {}));

    expect(result.added).toBeGreaterThan(0);
    const queue = await getQueueItems(t);
    expect(queue.length).toBe(result.added);
  });

  it("throws when queue is not empty", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t, 5);

    await as.mutation(api.srsReviewQueue.forceRefreshQueue, {});

    expect(await as.mutation(api.srsReviewQueue.forceRefreshQueue, {})).toMatchObject({ ok: false, error: { message: "Queue is not empty" } });
  });

  it("returns added: 0 when all cards have been introduced", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t, 2);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 20, dayResetUtcHour: 4, dailyGoal: 0 });

    const first = await unwrap(await as.mutation(api.srsReviewQueue.forceRefreshQueue, {}));
    expect(first.added).toBe(2);

    // Review all cards to empty the queue
    const queue = await getQueueItems(t);
    for (const item of queue) {
      await as.mutation(api.srsReviewQueue.recordReview, {
        srsCardId: item.srsCardId,
        rating: "good",
      });
    }

    const second = await unwrap(await as.mutation(api.srsReviewQueue.forceRefreshQueue, {}));
    expect(second.added).toBe(0);
  });

  it("respects maxNewCardsPerDay as the batch size", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t, 10);

    await as.mutation(api.userSettings.updateSrsSettings, { maxNewCardsPerDay: 3, dayResetUtcHour: 4, dailyGoal: 0 });

    const result = await unwrap(await as.mutation(api.srsReviewQueue.forceRefreshQueue, {}));
    expect(result.added).toBe(3);
  });

  it("throws when not authenticated", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);

    expect(await t.mutation(api.srsReviewQueue.forceRefreshQueue, {})).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });
});
