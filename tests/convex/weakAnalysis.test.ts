import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  createSetWithCards,
  createTestDb,
  insertDefaultSrsCardForTest,
  insertSrsReviewForTest,
  TEST_USER,
  unwrap,
} from "./helpers";
import type { WeakCardsResponse } from "../../src/lib/aiToolingSchemas";
import type { TestDb, TestIdentity } from "./testTypes";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type WeakCardInput = {
  front: string;
  timestamp: number;
};

async function setupWeakCards(
  t: TestDb,
  reviews: WeakCardInput[],
): Promise<{ as: TestIdentity }> {
  const as = t.withIdentity(TEST_USER);
  const { setId, cards } = await createSetWithCards(as, {
    cards: reviews.map((review, index) => ({
      fields: { Front: review.front, Back: `A${index}` },
      order: index,
    })),
  });

  for (let i = 0; i < reviews.length; i++) {
    await t.run(async (ctx) => {
      const srsCardId = await insertDefaultSrsCardForTest(ctx, {
        cardId: cards[i]!._id,
        setId,
        overrides: {
          easeFactor: 2.5,
          nextReviewAt: Number.MAX_SAFE_INTEGER,
          repetitions: 3,
          status: "review",
        },
      });
      await insertSrsReviewForTest(ctx, {
        cardId: cards[i]!._id,
        srsCardId,
        rating: "wrong",
        timestamp: reviews[i]!.timestamp,
      });
    });
  }

  return { as };
}

function weakFronts(weakCards: WeakCardsResponse): string[] {
  return weakCards.schemaGroups.flatMap((group) =>
    group.sets.flatMap((set) =>
      set.weakCards.map((card) => card.fields.Front ?? ""),
    ),
  );
}

describe("weak analysis review filters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("relative_days uses only reviews in the relative window", async () => {
    const now = new Date("2026-05-27T12:00:00Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const t = createTestDb();
    const { as } = await setupWeakCards(t, [
      { front: "inside", timestamp: now - 6 * MS_PER_DAY },
      { front: "outside", timestamp: now - 8 * MS_PER_DAY },
    ]);

    const result = await unwrap(
      await as.query(api.weakAnalysis.getMyWeakCards, {
        reviewFilter: { kind: "relative_days", days: 7 },
      }),
    );

    expect(weakFronts(result)).toEqual(["inside"]);
    expect(result.reviewFilter).toEqual({ kind: "relative_days", days: 7 });
  });

  it("calendar_range includes the start boundary and excludes the end boundary", async () => {
    const t = createTestDb();
    const { as } = await setupWeakCards(t, [
      { front: "start", timestamp: 1000 },
      { front: "end", timestamp: 2000 },
    ]);

    const result = await unwrap(
      await as.query(api.weakAnalysis.getMyWeakCards, {
        reviewFilter: { kind: "calendar_range", startMs: 1000, endMs: 2000 },
      }),
    );

    expect(weakFronts(result)).toEqual(["start"]);
  });

  it("returns InvalidInput for invalid calendar ranges", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    const result = await as.query(api.weakAnalysis.getMyWeakCards, {
      reviewFilter: { kind: "calendar_range", startMs: 1000, endMs: 1000 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("InvalidInput");
      expect(result.error.field).toBe("reviewFilter");
    }
  });

  it("returns InvalidInput for calendar ranges over 365 days", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);

    const result = await as.query(api.weakAnalysis.getMyWeakCards, {
      reviewFilter: {
        kind: "calendar_range",
        startMs: 0,
        endMs: 366 * MS_PER_DAY,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("InvalidInput");
    }
  });

  it("defaults missing filters to a 90-day review window", async () => {
    const now = new Date("2026-05-27T12:00:00Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const t = createTestDb();
    const { as } = await setupWeakCards(t, [
      { front: "inside", timestamp: now - 89 * MS_PER_DAY },
      { front: "outside", timestamp: now - 91 * MS_PER_DAY },
    ]);

    const result = await unwrap(
      await as.query(api.weakAnalysis.getMyWeakCards, {}),
    );

    expect(weakFronts(result)).toEqual(["inside"]);
    expect(result.reviewFilter).toEqual({ kind: "relative_days", days: 90 });
  });
});
