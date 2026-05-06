/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, vi, afterEach } from "vitest";
import { api, internal } from "../../convex/_generated/api";
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

async function createSetWithCards(
  as: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  cardCount: number
) {
  const setId = await as.mutation(api.flashcardSets.create, {
    name: "Test",
    fieldDefinitions: fieldDefs,
  });
  const cards = Array.from({ length: cardCount }, (_, i) => ({
    fields: { Front: `Q${i}`, Back: `A${i}` },
    order: i,
  }));
  await as.mutation(api.flashcards.batchCreate, { setId, cards });
  return setId;
}

describe("incrementDailyStats via recordResult", () => {
  afterEach(() => vi.useRealTimers());

  it("creates dailyStats row on first card review", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, { id: sessionId });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });

    const goalProgress = await as.query(api.progress.getDailyGoalProgress, {});
    expect(goalProgress).not.toBeNull();
    expect(goalProgress!.reviewed).toBe(1);
  });

  it("increments dailyStats on subsequent reviews", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 3);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, { id: sessionId });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[1],
      rating: "easy",
    });

    const goalProgress = await as.query(api.progress.getDailyGoalProgress, {});
    expect(goalProgress!.reviewed).toBe(2);
  });
});

describe("getDailyGoalProgress", () => {
  it("returns null percentage when no goal set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const progress = await as.query(api.progress.getDailyGoalProgress, {});
    expect(progress).not.toBeNull();
    expect(progress!.goal).toBeNull();
    expect(progress!.percentage).toBeNull();
    expect(progress!.reviewed).toBe(0);
  });

  it("returns correct percentage when goal is set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    await as.mutation(api.userSettings.update, { dailyGoal: 10 });

    // Re-read settings to verify dailyGoal persisted
    const settings = await as.query(api.userSettings.get, {});
    expect(settings?.dailyGoal).toBe(10);

    const setId = await createSetWithCards(as, 5);
    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });
    const session = await as.query(api.studySessions.get, { id: sessionId });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });

    const progress = await as.query(api.progress.getDailyGoalProgress, {});
    expect(progress!.goal).toBe(10);
    expect(progress!.reviewed).toBe(1);
    expect(progress!.percentage).toBeCloseTo(0.1);
  });
});

describe("getStreakStats", () => {
  it("returns zero streak when no activity", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const stats = await as.query(api.progress.getStreakStats, {});
    expect(stats).not.toBeNull();
    expect(stats!.currentStreak).toBe(0);
    expect(stats!.longestStreak).toBe(0);
  });

  it("returns streak of 1 after activity today", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });
    const session = await as.query(api.studySessions.get, { id: sessionId });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });

    const stats = await as.query(api.progress.getStreakStats, {});
    expect(stats!.currentStreak).toBe(1);
    expect(stats!.longestStreak).toBe(1);
  });
});

describe("getDailyHistory", () => {
  it("returns empty array when no activity", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const history = await as.query(api.progress.getDailyHistory, { days: 7 });
    expect(history).toEqual([]);
  });

  it("returns activity for today", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });
    const session = await as.query(api.studySessions.get, { id: sessionId });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });

    const history = await as.query(api.progress.getDailyHistory, { days: 7 });
    expect(history.length).toBe(1);
    expect(history[0].totalCards).toBe(1);
    expect(history[0].accuracy).toBe(1);
  });
});

describe("getCardStatusBreakdown", () => {
  it("counts cards by SRS status", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 3);

    // Enroll cards into SRS (normally done by cron)
    await t.mutation(internal.userSets.enrollCardsForSet, {
      userId: TEST_USER.tokenIdentifier,
      setId,
    });

    const breakdown = await as.query(
      api.progress.getCardStatusBreakdown,
      {}
    );
    expect(breakdown).not.toBeNull();
    expect(breakdown!.new).toBe(3);
    expect(breakdown!.learning).toBe(0);
    expect(breakdown!.review).toBe(0);
  });
});
