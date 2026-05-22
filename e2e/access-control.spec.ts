import { test, expect } from "./fixtures";

const FAKE_SET_ID = "j0000000000000000000000000000000";

test.describe("Access control — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/sets/new redirects to home", async ({ page }) => {
    await page.goto("/sets/new");
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("/sets/{id} redirects to home", async ({ page }) => {
    await page.goto(`/sets/${FAKE_SET_ID}`);
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("/study/{id} redirects to home", async ({ page }) => {
    await page.goto(`/study/${FAKE_SET_ID}`);
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("/sets/{id}/edit redirects to home", async ({ page }) => {
    await page.goto(`/sets/${FAKE_SET_ID}/edit`);
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Access control — invalid set ID", () => {
  test("non-existent set redirects to dashboard", async ({ page }) => {
    await page.goto(`/sets/${FAKE_SET_ID}`);
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  });

  test("study for non-existent set redirects to dashboard", async ({ page }) => {
    await page.goto(`/study/${FAKE_SET_ID}`);
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  });
});
