import { test, expect } from "./fixtures";
import path from "path";

test.describe("Wizard — CSV path", () => {
  test("creates a set by importing a CSV file", async ({ page }) => {
    await page.goto("/sets/new");

    await expect(page.getByText("Create New Flashcard Set")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step1.png" });

    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Test Chinese Set");
    await page.getByPlaceholder("What this set is for...").fill("E2E test set");
    await page.getByText("Import CSV").click();

    await page.getByRole("button", { name: "Next", exact: true }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.resolve(__dirname, "fixtures/test-cards.csv")
    );

    await expect(page.getByText("5 cards with 3 fields")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step2-preview.png" });

    await page.getByRole("button", { name: /Import 5 Cards/i }).click();
    await expect(page.getByText("5 cards ready with 3 fields")).toBeVisible();

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText("Configure the role and TTS")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step3-fields.png" });

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText("Test Chinese Set")).toBeVisible();
    await expect(page.getByText("Cards (5)")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step4-review.png" });

    await page.getByRole("button", { name: "Create Set" }).click();

    await expect(page.getByText("Set created!")).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "View Set" }).click();
    await page.waitForURL(/\/sets\/(?!new$)[^/]+$/, { timeout: 10000 });
    await expect(page.getByText("Test Chinese Set")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-done.png" });
  });
});
