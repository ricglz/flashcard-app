import type { BrowserContext, Page } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import {
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";

const CLERK_TESTING_TOKEN_REFRESH_INTERVAL_MS = 45_000;
const CLERK_SESSION_COOKIE_TIMEOUT_MS = 15_000;

type E2EClerk = {
  loaded?: boolean;
  session?: {
    getToken: (options?: { template?: "convex" }) => Promise<string | null>;
  } | null;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function refreshClerkTestingToken() {
  if (!process.env.CLERK_SECRET_KEY) {
    await clerkSetup();
    return;
  }

  if (!process.env.CLERK_FAPI) {
    await clerkSetup();
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    apiUrl: process.env.CLERK_API_URL,
  });
  const token = await clerk.testingTokens.createTestingToken();
  process.env.CLERK_TESTING_TOKEN = token.token;
}

export async function setupFreshClerkTestingToken(context: BrowserContext) {
  await refreshClerkTestingToken();
  await setupClerkTestingToken({ context });

  if (!process.env.CLERK_SECRET_KEY) {
    return () => {};
  }

  const interval = setInterval(() => {
    void refreshClerkTestingToken().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[e2e] Failed to refresh Clerk testing token: ${message}`);
    });
  }, CLERK_TESTING_TOKEN_REFRESH_INTERVAL_MS);

  if (typeof interval === "object" && "unref" in interval) {
    interval.unref();
  }

  return () => clearInterval(interval);
}

export async function waitForClerkSessionCookies(context: BrowserContext) {
  const deadline = Date.now() + CLERK_SESSION_COOKIE_TIMEOUT_MS;
  let cookieNames: string[] = [];

  while (Date.now() < deadline) {
    const cookies = await context.cookies("http://localhost:3000");
    cookieNames = cookies.map((cookie) => cookie.name);
    const hasSession = cookieNames.some(
      (name) => name === "__session" || name.startsWith("__session_"),
    );
    const hasClientUat = cookieNames.some(
      (name) => name === "__client_uat" || name.startsWith("__client_uat_"),
    );

    if (hasSession && hasClientUat) return;

    await delay(250);
  }

  throw new Error(
    `Clerk sign-in did not create first-party session cookies. Saw cookies: ${cookieNames.join(", ")}`,
  );
}

async function hasClerkSessionCookies(context: BrowserContext) {
  const cookies = await context.cookies("http://localhost:3000");
  const names = cookies.map((cookie) => cookie.name);
  return names.some(
    (name) => name === "__session" || name.startsWith("__session_"),
  );
}

export async function waitForClerkClientSession(page: Page) {
  if (!(await hasClerkSessionCookies(page.context()))) return;

  await page.waitForFunction(
    async () => {
      const clerk = (globalThis as { Clerk?: E2EClerk }).Clerk;

      if (clerk === undefined || !clerk.loaded || !clerk.session) return false;

      try {
        return Boolean(await clerk.session.getToken({ template: "convex" }));
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 15_000 },
  );
}
