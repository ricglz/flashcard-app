import { test, expect } from "@playwright/test";

test.describe("Auth guard redirects", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/sets/new redirects unauthenticated users to home", async ({
    page,
  }) => {
    await page.goto("/sets/new");

    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
