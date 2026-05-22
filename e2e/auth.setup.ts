import { expect, test as setup } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import {
  setupFreshClerkTestingToken,
  waitForClerkClientSession,
  waitForClerkSessionCookies,
} from "./clerk-testing";
import { TEST_EMAIL } from "./global-setup";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const cleanup = await setupFreshClerkTestingToken(page.context());
  try {
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_EMAIL });
    await waitForClerkSessionCookies(page.context());
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForClerkClientSession(page);
    await expect(page.getByRole("link", { name: "New Set" })).toBeVisible({
      timeout: 15_000,
    });

    await page.waitForURL("/", { timeout: 15000 });
    await page.context().storageState({ path: authFile });
  } finally {
    cleanup();
  }
});
