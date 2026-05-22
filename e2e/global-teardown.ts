import { execSync } from "child_process";
import { createClerkClient } from "@clerk/backend";
import path from "path";
import { TEST_EMAIL } from "./global-setup";

process.loadEnvFile(path.resolve(__dirname, "../.env.local"));

export default async function globalTeardown() {
  console.warn("[teardown] starting cleanup...");

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    emailAddress: [TEST_EMAIL],
  });
  console.warn(`[teardown] found ${users.data.length} test user(s) in Clerk`);

  for (const user of users.data) {
    const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
    const tokenIdentifier = `${issuer}|${user.id}`;
    console.warn(`[teardown] cleaning Convex data for ${user.id} (issuer: ${issuer ?? "MISSING"})`);

    try {
      const output = execSync(
        `npx convex run testing:cleanupTestUser '${JSON.stringify({ userId: tokenIdentifier })}'`,
        { stdio: "pipe", timeout: 30_000 },
      );
      console.warn(`[teardown] Convex cleanup done: ${output.toString().trim()}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[teardown] Convex cleanup failed: ${msg}`);
    }

    await clerk.users.deleteUser(user.id);
    console.warn(`[teardown] deleted Clerk user ${user.id}`);
  }

  console.warn("[teardown] done");
}
