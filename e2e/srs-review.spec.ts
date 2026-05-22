import { test, expect } from "./fixtures";
import { getSrsState, seedFlashcardSet } from "./seed";

test.describe("SRS review", () => {
  test("reviews a queued SRS card and updates scheduling state", async ({ page }) => {
    const seeded = await seedFlashcardSet({
      name: "E2E SRS Seeded Set",
      srsEnabled: true,
      queueSrsCards: true,
      cards: [
        { front: "uno", back: "one" },
        { front: "dos", back: "two" },
      ],
    });

    await page.goto("/");
    await expect(page.getByText("2 cards to review")).toBeVisible();
    await page.getByRole("link", { name: "Start Review" }).click();
    await page.waitForURL("/srs");

    await expect(page.getByText("1 / 2")).toBeVisible();
    await expect(page.getByText("uno")).toBeVisible();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.getByText("How well did you recall this?")).toBeVisible();
    await page.getByRole("button", { name: "Good", exact: true }).click();

    await expect(page.getByText("2 / 2")).toBeVisible();
    await expect
      .poll(
        async () => {
          const state = await getSrsState(seeded.setId);
          return {
            queueRemaining: state.queueRemaining,
            reviewCount: state.reviewCount,
            reviewedCards: state.srsCards.filter(
              (card) => card.lastReviewedAt !== null && card.repetitions === 1,
            ).length,
          };
        },
        { timeout: 15_000 },
      )
      .toEqual({
        queueRemaining: 1,
        reviewCount: 1,
        reviewedCards: 1,
      });
  });
});
