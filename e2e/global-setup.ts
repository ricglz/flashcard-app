import { createClerkClient } from "@clerk/backend";
import path from "path";

process.loadEnvFile(path.resolve(__dirname, "../.env.local"));

export const TEST_EMAIL = "e2e+clerk_test@example.com";
const TEST_PASSWORD = "E2eFlashcard$9xQm!";

export default async function globalSetup() {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const existing = await clerk.users.getUserList({
    emailAddress: [TEST_EMAIL],
  });
  if (existing.data.length === 0) {
    await clerk.users.createUser({
      emailAddress: [TEST_EMAIL],
      password: TEST_PASSWORD,
    });
  }
}
