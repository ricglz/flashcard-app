import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { SRS_DEFAULTS } from "../../convex/srs";
import { MAX_CARDS_PER_BATCH } from "../../convex/lib/cardCreation";
import type { FieldDefinition } from "../../src/lib/types";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import type { TestIdentity } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");

export async function unwrap<T>(
  result: { ok: true; value: T } | { ok: false; error: { message: string } } | T,
): Promise<T> {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === false) throw new Error(result.error.message);
    return result.value;
  }
  return result as T;
}

export const TEST_USER = {
  tokenIdentifier: "test-user-1",
  subject: "user1",
};

export const fieldDefs: FieldDefinition[] = [
  { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
  { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
];

export const fieldDefsWithTts: FieldDefinition[] = [
  { name: "Character", role: "primary" as const, metadata: { tts: { lang: "zh-CN" } }, order: 0 },
  { name: "Pinyin", role: "pronunciation" as const, metadata: {}, order: 1 },
  { name: "Meaning", role: "definition" as const, metadata: {}, order: 2 },
];

export function createTestDb() {
  return convexTest(schema, modules);
}

type TestCardInput = {
  fields: Record<string, string>;
  order?: number;
};

export async function createSetWithCards(
  as: TestIdentity,
  {
    name = "Test",
    fieldDefinitions = fieldDefs,
    cardCount = 2,
    cards,
  }: {
    name?: string;
    fieldDefinitions?: FieldDefinition[];
    cardCount?: number;
    cards?: TestCardInput[];
  } = {},
): Promise<{ setId: Id<"flashcardSets">; cards: Doc<"flashcards">[] }> {
  const setId = await unwrap(
    await as.mutation(api.flashcardSets.create, {
      name,
      fieldDefinitions,
    }),
  );
  const fieldNames = fieldDefinitions.map((field) => field.name);
  const cardInputs =
    cards ??
    Array.from({ length: cardCount }, (_, index) => ({
      fields: Object.fromEntries(
        fieldNames.map((fieldName) => [fieldName, `${fieldName}${index}`]),
      ),
      order: index,
    }));

  if (cardInputs.length > 0) {
    for (let start = 0; start < cardInputs.length; start += MAX_CARDS_PER_BATCH) {
      const batch = cardInputs.slice(start, start + MAX_CARDS_PER_BATCH);
      await unwrap(
        await as.mutation(api.flashcards.batchCreate, {
          setId,
          cards: batch.map((card, index) => ({
            fields: card.fields,
            order: card.order ?? start + index,
          })),
        }),
      );
    }
  }

  const createdCards = await unwrap(await as.query(api.flashcards.list, { setId }));
  return { setId, cards: createdCards };
}

export async function startStudySession(
  as: TestIdentity,
  setId: Id<"flashcardSets">,
  {
    frontFields = ["Front"],
    backFields = ["Back"],
    ttsOnlyFields,
    shuffle = false,
    cardLimit,
  }: {
    frontFields?: string[];
    backFields?: string[];
    ttsOnlyFields?: string[];
    shuffle?: boolean;
    cardLimit?: number;
  } = {},
): Promise<Id<"studySessions">> {
  return await unwrap(
    await as.mutation(api.studySessions.start, {
      setId,
      frontFields,
      backFields,
      ...(ttsOnlyFields ? { ttsOnlyFields } : {}),
      shuffle,
      ...(cardLimit === undefined ? {} : { cardLimit }),
    }),
  );
}

export async function getStudySession(
  as: TestIdentity,
  sessionId: Id<"studySessions">,
): Promise<Doc<"studySessions">> {
  return await unwrap(await as.query(api.studySessions.get, { id: sessionId }));
}

export async function recordStudyResult(
  as: TestIdentity,
  {
    sessionId,
    cardId,
    rating = "good",
  }: {
    sessionId: Id<"studySessions">;
    cardId: Id<"flashcards">;
    rating?: "wrong" | "hard" | "good" | "easy";
  },
) {
  return await unwrap(
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId,
      rating,
    }),
  );
}

export async function insertDefaultSrsCardForTest(
  ctx: MutationCtx,
  {
    userId = TEST_USER.tokenIdentifier,
    cardId,
    setId,
    overrides = {},
  }: {
    userId?: string;
    cardId: Id<"flashcards">;
    setId: Id<"flashcardSets">;
    overrides?: Partial<Pick<
      Doc<"srsCards">,
      "easeFactor" | "interval" | "repetitions" | "nextReviewAt" | "lastReviewedAt" | "status"
    >>;
  },
): Promise<Id<"srsCards">> {
  return await ctx.db.insert("srsCards", {
    userId,
    cardId,
    setId,
    easeFactor: SRS_DEFAULTS.INITIAL_EASE_FACTOR,
    interval: SRS_DEFAULTS.INITIAL_INTERVAL,
    repetitions: SRS_DEFAULTS.INITIAL_REPETITIONS,
    nextReviewAt: 0,
    status: "new",
    ...overrides,
  });
}

export async function insertQueuedSrsCardForTest(
  ctx: MutationCtx,
  {
    userId = TEST_USER.tokenIdentifier,
    cardId,
    setId,
    order = 0,
    queuedAt = Date.now(),
    srsOverrides,
  }: {
    userId?: string;
    cardId: Id<"flashcards">;
    setId: Id<"flashcardSets">;
    order?: number;
    queuedAt?: number;
    srsOverrides?: Partial<Pick<
      Doc<"srsCards">,
      "easeFactor" | "interval" | "repetitions" | "nextReviewAt" | "lastReviewedAt" | "status"
    >>;
  },
): Promise<Id<"srsCards">> {
  const srsCardId = await insertDefaultSrsCardForTest(ctx, {
    userId,
    cardId,
    setId,
    overrides: {
      interval: 1,
      repetitions: 1,
      status: "learning",
      ...srsOverrides,
    },
  });
  await ctx.db.insert("reviewQueue", {
    userId,
    cardId,
    srsCardId,
    setId,
    queuedAt,
    order,
  });
  return srsCardId;
}

export async function insertSrsReviewForTest(
  ctx: MutationCtx,
  {
    userId = TEST_USER.tokenIdentifier,
    cardId,
    srsCardId,
    rating = "good",
    timestamp,
    newInterval = 1,
    newEaseFactor = SRS_DEFAULTS.INITIAL_EASE_FACTOR,
  }: {
    userId?: string;
    cardId: Id<"flashcards">;
    srsCardId: Id<"srsCards">;
    rating?: "wrong" | "hard" | "good" | "easy";
    timestamp: number;
    newInterval?: number;
    newEaseFactor?: number;
  },
) {
  await ctx.db.insert("srsReviews", {
    userId,
    cardId,
    srsCardId,
    rating,
    timestamp,
    newInterval,
    newEaseFactor,
  });
}
