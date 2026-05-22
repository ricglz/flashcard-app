import { test, expect } from "./fixtures";

test.describe("Study session — happy path", () => {
  test("completes a study session and sees results", async ({ page }) => {
    await page.goto("/sets/new");

    // Create a set with 2 cards
    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("E2E Study Set");
    await page.getByText("Add Manually").click();
    await page.getByRole("combobox").selectOption("chinese");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await page.getByPlaceholder("Enter character...").fill("好");
    await page.getByPlaceholder("Enter pinyin...").fill("hǎo");
    await page.getByPlaceholder("Enter meaning...").fill("good");
    await page.getByRole("button", { name: "Add Card" }).click();
    await expect(page.getByText("1 card added")).toBeVisible();

    await page.getByPlaceholder("Enter character...").fill("你");
    await page.getByPlaceholder("Enter pinyin...").fill("nǐ");
    await page.getByPlaceholder("Enter meaning...").fill("you");
    await page.getByRole("button", { name: "Add Card" }).click();
    await expect(page.getByText("2 cards added")).toBeVisible();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Configure the role and TTS")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Create Set" }).click();
    await expect(page.getByText("Set created!")).toBeVisible({ timeout: 15000 });

    // Go to set detail
    await page.getByRole("link", { name: "View Set" }).click();
    await page.waitForURL(/\/sets\/(?!new$)[^/]+$/, { timeout: 10000 });
    await expect(page.getByText("E2E Study Set")).toBeVisible();

    // Navigate to study config
    await page.getByRole("link", { name: "Study" }).click();
    await expect(page.getByText("E2E Study Set")).toBeVisible();
    await expect(page.getByText("2 cards")).toBeVisible();
    await page.screenshot({ path: "test-results/study-config.png" });

    // Start session (fields should be pre-selected from defaults)
    const startButton = page.getByRole("button", { name: "Start New Session" });
    await expect(startButton).toBeEnabled();
    await startButton.click();
    await page.waitForURL(/\/study\/.+\/session/);

    // Card 1: reveal and rate
    await expect(page.getByText("1 / 2")).toBeVisible();
    await page.screenshot({ path: "test-results/study-card1-front.png" });

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.getByText("How did you do?")).toBeVisible();
    for (const rating of ["Wrong", "Hard", "Good", "Easy"]) {
      await expect(page.getByRole("button", { name: rating })).toBeVisible();
    }
    await page.screenshot({ path: "test-results/study-card1-revealed.png" });
    await page.getByRole("button", { name: "Good" }).click();

    // Card 2: reveal and rate
    await expect(page.getByText("2 / 2")).toBeVisible();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Easy" }).click();

    // Results page
    await expect(page.getByText("Session Results")).toBeVisible();
    await expect(page.getByText("Recent Breakdown")).toBeVisible();
    await expect(page.getByRole("link", { name: "Study Again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/study-results.png" });
  });
});
