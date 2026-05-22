import { test as base, expect } from "@playwright/test";
import {
  setupFreshClerkTestingToken,
  waitForClerkClientSession,
} from "./clerk-testing";

export const test = base.extend({
  context: async ({ context }, run) => {
    const cleanup = await setupFreshClerkTestingToken(context);

    try {
      await run(context);
    } finally {
      cleanup();
    }
  },
  page: async ({ page }, run) => {
    const goto = page.goto.bind(page);
    page.goto = (async (...args: Parameters<typeof page.goto>) => {
      const response = await goto(...args);
      await waitForClerkClientSession(page);
      return response;
    }) as typeof page.goto;

    await run(page);
  },
});

export { expect };
