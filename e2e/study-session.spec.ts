import { test, expect } from "./fixtures";
import { createManualChineseSet } from "./helpers";

test.describe("Study session — happy path", () => {
  test("completes a study session and sees results", async ({ page }) => {
    await createManualChineseSet(page, "E2E Study Set");
    await expect(page.getByText("E2E Study Set")).toBeVisible();

    await page.getByRole("link", { name: "Study" }).click();
    await expect(page.getByText("E2E Study Set")).toBeVisible();
    await expect(page.getByText("2 cards")).toBeVisible();
    await page.screenshot({ path: "test-results/study-config.png" });

    const startButton = page.getByRole("button", { name: "Start New Session" });
    await expect(startButton).toBeEnabled();
    await startButton.click();
    await page.waitForURL(/\/study\/.+\/session/);

    await expect(page.getByText("1 / 2")).toBeVisible();
    await page.screenshot({ path: "test-results/study-card1-front.png" });

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.getByText("How did you do?")).toBeVisible();
    for (const rating of ["Wrong", "Hard", "Good", "Easy"]) {
      await expect(page.getByRole("button", { name: rating })).toBeVisible();
    }
    await page.screenshot({ path: "test-results/study-card1-revealed.png" });
    await page.getByRole("button", { name: "Good" }).click();

    await expect(page.getByText("2 / 2")).toBeVisible();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Easy" }).click();

    await expect(page.getByText("Session Results")).toBeVisible();
    await expect(page.getByText("Recent Breakdown")).toBeVisible();
    await expect(page.getByRole("link", { name: "Study Again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/study-results.png" });
  });
});
