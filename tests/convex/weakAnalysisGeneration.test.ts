import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  createSetWithCards,
  createTestDb,
  insertDefaultSrsCardForTest,
  insertSrsReviewForTest,
  TEST_USER,
} from "./helpers";

describe("generateRemedialCards review filters", () => {
  it("uses the selected review filter for weak-card lookup", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    await as.mutation(api.userSettings.updateAiConfig, {
      provider: "openai",
      apiKey: "sk-test-key",
    });
    const { setId, cards } = await createSetWithCards(as, {
      cards: [{ fields: { Front: "outside", Back: "A0" }, order: 0 }],
    });

    await t.run(async (ctx) => {
      const srsCardId = await insertDefaultSrsCardForTest(ctx, {
        cardId: cards[0]!._id,
        setId,
        overrides: {
          easeFactor: 2.5,
          nextReviewAt: Number.MAX_SAFE_INTEGER,
          repetitions: 3,
          status: "review",
        },
      });
      await insertSrsReviewForTest(ctx, {
        cardId: cards[0]!._id,
        srsCardId,
        rating: "wrong",
        timestamp: 1000,
      });
    });

    const result = await as.action(api.ai.generateRemedialCards, {
      name: "Remedial Cards",
      addToSrs: false,
      reviewFilter: { kind: "calendar_range", startMs: 2000, endMs: 3000 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("NotFound");
    }
  });
});
