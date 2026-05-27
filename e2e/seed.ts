import { execFileSync } from "child_process";
import path from "path";
import { createClerkClient } from "@clerk/backend";
import { TEST_EMAIL } from "./global-setup";

process.loadEnvFile(path.resolve(__dirname, "../.env.local"));

const repoRoot = path.resolve(__dirname, "..");
let tokenIdentifierPromise: Promise<string> | null = null;

type SeedCard = {
  front: string;
  back: string;
};

type SeedSrsSetup =
  | { kind: "disabled" }
  | { kind: "enabled"; queue: "none" | "all" };

type SeededFlashcardSet = {
  setId: string;
  cardIds: string[];
  srsCardIds: string[];
  queuedCount: number;
};

type StudySessionState = {
  sessionId: string;
  status: "in_progress" | "completed" | "abandoned";
  currentIndex: number;
  completedAt: number | null;
  resultCount: number;
} | null;

type SrsState = {
  queueRemaining: number;
  reviewCount: number;
  srsCards: Array<{
    srsCardId: string;
    cardId: string;
    status: "new" | "learning" | "review";
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewAt: number;
    lastReviewedAt: number | null;
  }>;
  reviews: Array<{
    srsCardId: string;
    rating: "wrong" | "hard" | "good" | "easy";
    newInterval: number;
    newEaseFactor: number;
  }>;
};

function parseConvexJson<T>(stdout: string): T {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    throw new Error("Convex run returned no output");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const jsonStart = trimmed.search(/[{[]/);
    if (jsonStart === -1) throw new Error(`Convex run returned non-JSON output: ${trimmed}`);
    return JSON.parse(trimmed.slice(jsonStart)) as T;
  }
}

function runTestingFunction<T>(name: string, args: Record<string, unknown>): T {
  const stdout = execFileSync(
    "npx",
    ["convex", "run", `testing:${name}`, JSON.stringify(args)],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    },
  );
  return parseConvexJson<T>(stdout);
}

async function resolveTestUserTokenIdentifier(): Promise<string> {
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
  if (!issuer) {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN is required for seeded E2E tests");
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    apiUrl: process.env.CLERK_API_URL,
  });
  const users = await clerk.users.getUserList({
    emailAddress: [TEST_EMAIL],
  });
  const user = users.data[0];
  if (!user) {
    throw new Error(`Clerk test user ${TEST_EMAIL} does not exist`);
  }

  return `${issuer}|${user.id}`;
}

export async function getTestUserTokenIdentifier(): Promise<string> {
  tokenIdentifierPromise ??= resolveTestUserTokenIdentifier();
  return tokenIdentifierPromise;
}

export async function seedFlashcardSet({
  name,
  cards,
  srs = { kind: "disabled" },
}: {
  name: string;
  cards: SeedCard[];
  srs?: SeedSrsSetup;
}): Promise<SeededFlashcardSet> {
  const userId = await getTestUserTokenIdentifier();
  return runTestingFunction<SeededFlashcardSet>("seedFlashcardSet", {
    userId,
    name,
    cards,
    srs,
  });
}

export async function getLatestStudySessionState(
  setId: string,
): Promise<StudySessionState> {
  const userId = await getTestUserTokenIdentifier();
  return runTestingFunction<StudySessionState>("getLatestStudySessionState", {
    userId,
    setId,
  });
}

export async function getSrsState(setId: string): Promise<SrsState> {
  const userId = await getTestUserTokenIdentifier();
  return runTestingFunction<SrsState>("getSrsState", {
    userId,
    setId,
  });
}
