import { test, expect } from "@playwright/test";

test.describe("Wizard — Manual path", () => {
  test("creates a set by adding cards manually", async ({ page }) => {
    await page.goto("/sets/new");

    // Step 1: Name & Source
    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Manual Test Set");
    await page.getByText("Add Manually").click();

    // Pick Chinese preset
    await page.getByRole("combobox").selectOption("chinese");
    await page.screenshot({ path: "test-results/wizard-manual-step1.png" });

    // Next → Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Add cards manually
    // Fields should be pre-filled from Chinese preset: Character, Pinyin, Meaning
    await page.getByPlaceholder("Enter character...").fill("好");
    await page.getByPlaceholder("Enter pinyin...").fill("hǎo");
    await page.getByPlaceholder("Enter meaning...").fill("good");
    await page.getByRole("button", { name: "Add Card" }).click();

    // Verify card was added
    await expect(page.getByText("1 card added")).toBeVisible();

    // Add a second card
    await page.getByPlaceholder("Enter character...").fill("你");
    await page.getByPlaceholder("Enter pinyin...").fill("nǐ");
    await page.getByPlaceholder("Enter meaning...").fill("you");
    await page.getByRole("button", { name: "Add Card" }).click();

    await expect(page.getByText("2 cards added")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-step2.png" });

    // Next → Step 3
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: Configure fields — verify card preview is visible
    await expect(page.getByText("Configure the role and TTS")).toBeVisible();
    await expect(page.getByText("Card Preview")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-step3.png" });

    // Next → Step 4
    await page.getByRole("button", { name: "Next" }).click();

    // Step 4: Review
    await expect(page.getByText("Manual Test Set")).toBeVisible();
    await expect(page.getByText("Cards (2)")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-step4.png" });

    // Create set
    await page.getByRole("button", { name: "Create Set" }).click();

    // Should redirect to set detail page
    await page.waitForURL(/\/sets\/.+/, { timeout: 10000 });
    await expect(page.getByText("Manual Test Set")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-done.png" });
  });

  test("wizard navigation validation", async ({ page }) => {
    await page.goto("/sets/new");

    // Next should be disabled without name and source
    const nextButton = page.getByRole("button", { name: "Next" });
    await expect(nextButton).toBeDisabled();

    // Fill name but no source — still disabled
    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Test");
    await expect(nextButton).toBeDisabled();

    // Select source — now enabled
    await page.getByText("Add Manually").click();
    await expect(nextButton).toBeEnabled();

    // Go to Step 2 — Next should be disabled (no cards yet)
    await nextButton.click();

    // Need to define fields first for manual path
    await page.getByPlaceholder(/Field name/).fill("Front");
    await page.getByRole("button", { name: "Add Field" }).click();

    // Still disabled — no cards
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

    // Back should work and preserve state
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByPlaceholder("e.g., 100 Common Chinese Characters")
    ).toHaveValue("Test");

    await page.screenshot({ path: "test-results/wizard-nav-validation.png" });
  });
});
