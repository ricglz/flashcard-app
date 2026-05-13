import { test as setup } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await setupClerkTestingToken({ page });

  await page.goto("/");

  // Open the Clerk sign-in modal (no dedicated sign-up route exists)
  await page.getByRole("button", { name: /sign in/i }).click();

  const testEmail = `test+${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(testPassword);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Wait for auth to complete and redirect to home
  await page.waitForURL("/", { timeout: 15000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
