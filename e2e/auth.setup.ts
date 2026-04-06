import { test as setup } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await setupClerkTestingToken({ page });

  await page.goto("/sign-up");

  // Fill in the sign-up form with a test user
  const testEmail = `test+${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByLabel(/password/i).fill(testPassword);
  await page.getByRole("button", { name: /sign up|continue/i }).click();

  // Wait for auth to complete and redirect to home
  await page.waitForURL("/", { timeout: 15000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
