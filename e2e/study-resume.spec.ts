import { test, expect } from "./fixtures";
import { createManualChineseSet } from "./helpers";

test.describe("Study session — resume", () => {
  test("resumes an in-progress session", async ({ page }) => {
    await createManualChineseSet(page, "E2E Resume Set");
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
