import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Wizard — CSV path", () => {
  test("creates a set by importing a CSV file", async ({ page }) => {
    await page.goto("/sets/new");

    // Step 1: Name & Source
    await expect(page.getByText("Create New Flashcard Set")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step1.png" });

    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Test Chinese Set");
    await page.getByPlaceholder("What this set is for...").fill("E2E test set");
    await page.getByText("Import CSV").click();

    // Next → Step 2
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2: Upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.resolve(__dirname, "fixtures/test-cards.csv")
    );

    // Wait for preview to appear
    await expect(page.getByText("5 cards with 3 fields")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step2-preview.png" });

    // Confirm import
    await page.getByRole("button", { name: /Import 5 Cards/i }).click();
    await expect(page.getByText("5 cards ready with 3 fields")).toBeVisible();

    // Next → Step 3
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3: Configure fields
    await expect(page.getByText("Configure the role and TTS")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step3-fields.png" });

    // Next → Step 4
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 4: Review
    await expect(page.getByText("Test Chinese Set")).toBeVisible();
    await expect(page.getByText("Cards (5)")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-step4-review.png" });

    // Create set
    await page.getByRole("button", { name: "Create Set" }).click();

    // Should redirect to set detail page
    await page.waitForURL(/\/sets\/.+/, { timeout: 10000 });
    await expect(page.getByText("Test Chinese Set")).toBeVisible();
    await expect(page.getByText("5 cards")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-csv-done.png" });
  });
});
