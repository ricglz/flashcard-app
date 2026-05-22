import { test, expect } from "./fixtures";

test.describe("Study session — resume", () => {
  test("resumes an in-progress session", async ({ page }) => {
    await page.goto("/sets/new");
    await page.getByPlaceholder("e.g., 100 Common Chinese Characters").fill("E2E Resume Set");
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

    await page.getByRole("link", { name: "View Set" }).click();
    await page.waitForURL(/\/sets\/(?!new$)[^/]+$/, { timeout: 10000 });
    await expect(page.getByText("E2E Resume Set")).toBeVisible();
    const setUrl = page.url();
    const setId = setUrl.match(/\/sets\/([^/?]+)/)?.[1];

    await page.getByRole("link", { name: "Study" }).click();
    await page.getByRole("button", { name: "Start New Session" }).click();
    await page.waitForURL(/\/study\/.+\/session/);

    await expect(page.getByText("1 / 2")).toBeVisible();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Good" }).click();
    await expect(page.getByText("2 / 2")).toBeVisible();

    await page.getByRole("button", { name: "End Session" }).click();
    await page.waitForURL(`/study/${setId}`);

    await expect(page.getByText(/active session/)).toBeVisible();
    await expect(page.getByText("1/2 cards done")).toBeVisible();
    await page.screenshot({ path: "test-results/study-resume-banner.png" });

    await page.getByRole("link", { name: "Resume" }).click();
    await page.waitForURL(/\/study\/.+\/session/);

    await expect(page.getByText("2 / 2")).toBeVisible();

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Easy" }).click();

    await expect(page.getByText("Session Results")).toBeVisible();
    await page.screenshot({ path: "test-results/study-resume-results.png" });
  });
});
