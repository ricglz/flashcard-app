import { test as setup } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { TEST_EMAIL } from "./global-setup";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_EMAIL });

  await page.waitForURL("/", { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
