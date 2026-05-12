/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api, internal } from "../../convex/_generated/api";
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

async function setupSrsSet(t: ReturnType<typeof convexTest>, cardCount = 3) {
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

async function getQueueLength(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return (
      await ctx.db
        .query("reviewQueue")
        .withIndex("by_userId_and_order", (q) =>
          q.eq("userId", TEST_USER.tokenIdentifier)
        )
        .take(500)
    ).length;
  });
}

describe("populateQueueForUser respects dayResetUtcHour", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds new cards when current UTC hour matches the user's reset hour", async () => {
    vi.setSystemTime(new Date("2025-06-15T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t);

    await as.mutation(api.userSettings.update, { dayResetUtcHour: 8 });

    await t.mutation(internal.srsEngine.populateQueueForUser, {
      userId: TEST_USER.tokenIdentifier,
    });

    const count = await getQueueLength(t);
    expect(count).toBeGreaterThan(0);
  });

  it("does NOT add new cards when current UTC hour differs from reset hour", async () => {
    vi.setSystemTime(new Date("2025-06-15T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { as } = await setupSrsSet(t);

    await as.mutation(api.userSettings.update, { dayResetUtcHour: 8 });

    await t.mutation(internal.srsEngine.populateQueueForUser, {
      userId: TEST_USER.tokenIdentifier,
    });

    const count = await getQueueLength(t);
    expect(count).toBe(0);
  });

  it("uses default reset hour (4 UTC) when no setting exists", async () => {
    vi.setSystemTime(new Date("2025-06-15T04:00:00Z"));
    const t = convexTest(schema, modules);
    await setupSrsSet(t);

    await t.mutation(internal.srsEngine.populateQueueForUser, {
      userId: TEST_USER.tokenIdentifier,
    });

    const count = await getQueueLength(t);
    expect(count).toBeGreaterThan(0);
  });

  it("still adds due review cards outside the reset hour", async () => {
    vi.setSystemTime(new Date("2025-06-15T14:00:00Z"));
    const t = convexTest(schema, modules);
    const { setId, as } = await setupSrsSet(t, 1);

    await as.mutation(api.userSettings.update, { dayResetUtcHour: 8 });

    const cardList = await as.query(api.flashcards.list, { setId });

    await t.run(async (ctx) => {
      await ctx.db.insert("srsCards", {
        userId: TEST_USER.tokenIdentifier,
        cardId: cardList[0]._id,
        setId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 2,
        nextReviewAt: new Date("2025-06-14T00:00:00Z").getTime(),
        status: "review",
      });
    });

    await t.mutation(internal.srsEngine.populateQueueForUser, {
      userId: TEST_USER.tokenIdentifier,
    });

    const count = await getQueueLength(t);
    expect(count).toBe(1);
  });
});
