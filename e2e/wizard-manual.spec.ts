import { test, expect } from "./fixtures";

test.describe("Wizard — Manual path", () => {
  test("creates a set by adding cards manually", async ({ page }) => {
    await page.goto("/sets/new");

    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Manual Test Set");
    await page.getByText("Add Manually").click();

    await page.getByRole("combobox").selectOption("chinese");
    await page.screenshot({ path: "test-results/wizard-manual-step1.png" });

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
    await page.screenshot({ path: "test-results/wizard-manual-step2.png" });

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText("Configure the role and TTS")).toBeVisible();
    await expect(page.getByText("Card Preview")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-step3.png" });

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText("Manual Test Set")).toBeVisible();
    await expect(page.getByText("Cards (2)")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-step4.png" });

    await page.getByRole("button", { name: "Create Set" }).click();
    await expect(page.getByText("Set created!")).toBeVisible({ timeout: 15000 });

    await page.getByRole("link", { name: "View Set" }).click();
    await page.waitForURL(/\/sets\/(?!new$)[^/]+$/, { timeout: 10000 });
    await expect(page.getByText("Manual Test Set")).toBeVisible();
    await page.screenshot({ path: "test-results/wizard-manual-done.png" });
  });


  test("source method switching clears incompatible manual draft data", async ({ page }) => {
    await page.goto("/sets/new");

    const nextButton = page.getByRole("button", { name: "Next", exact: true });

    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Switch Source Test");
    await page.getByText("Add Manually").click();
    await page.getByRole("combobox").selectOption("chinese");
    await nextButton.click();

    await page.getByPlaceholder("Enter character...").fill("好");
    await page.getByPlaceholder("Enter pinyin...").fill("hǎo");
    await page.getByPlaceholder("Enter meaning...").fill("good");
    await page.getByRole("button", { name: "Add Card" }).click();
    await expect(page.getByText("1 card added")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByText("Import CSV").click();

    await expect(page.getByText("Import CSV")).toBeVisible();
    await expect(page.getByText("Add Manually")).toBeVisible();
    await expect(nextButton).toBeEnabled();

    await nextButton.click();
    await expect(page.getByText("Drop a CSV file here or click to browse")).toBeVisible();
    await expect(page.getByText("1 card added")).toBeHidden();
    await expect(page.getByPlaceholder("Enter character...")).toBeHidden();

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByText("Add Manually").click();
    await nextButton.click();

    await expect(page.getByPlaceholder(/Field name/)).toBeVisible();
    await expect(page.getByText("1 card added")).toBeHidden();
    await expect(page.getByPlaceholder("Enter character...")).toBeHidden();
  });

  test("wizard navigation validation", async ({ page }) => {
    await page.goto("/sets/new");

    const nextButton = page.getByRole("button", { name: "Next", exact: true });
    await expect(nextButton).toBeDisabled();

    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("Test");
    await expect(nextButton).toBeDisabled();

    await page.getByText("Add Manually").click();
    await expect(nextButton).toBeEnabled();

    await nextButton.click();

    await page.getByPlaceholder(/Field name/).fill("Front");
    await page.getByRole("button", { name: "Add Field" }).click();

    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByPlaceholder("e.g., 100 Common Chinese Characters")
    ).toHaveValue("Test");

    await page.screenshot({ path: "test-results/wizard-nav-validation.png" });
  });
});
