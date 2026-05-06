/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { computeOverallScore, RATING_SCORES } from "../../convex/studySessions";

const modules = import.meta.glob("../../convex/**/*.ts");

const TEST_USER = {
  tokenIdentifier: "test-user-1",
  subject: "user1",
};

const fieldDefs = [
  { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
  { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
];

const fieldDefsWithTts = [
  { name: "Character", role: "primary" as const, metadata: { tts: { lang: "zh-CN" } }, order: 0 },
  { name: "Pinyin", role: "pronunciation" as const, metadata: {}, order: 1 },
  { name: "Meaning", role: "definition" as const, metadata: {}, order: 2 },
];

async function createSetWithCards(
  as: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  cardCount: number,
  defs = fieldDefs
) {
  const setId = await as.mutation(api.flashcardSets.create, {
    name: "Test",
    fieldDefinitions: defs,
  });
  const fieldNames = defs.map((d) => d.name);
  const cards = Array.from({ length: cardCount }, (_, i) => ({
    fields: Object.fromEntries(fieldNames.map((n) => [n, `${n}${i}`])),
    order: i,
  }));
  await as.mutation(api.flashcards.batchCreate, { setId, cards });
  return setId;
}

describe("computeOverallScore", () => {
  it("returns 0 for empty results", () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it("returns 0 for all wrong", () => {
    const results = [{ rating: "wrong" }, { rating: "wrong" }];
    expect(computeOverallScore(results)).toBe(0);
  });

  it("returns 1 for all easy", () => {
    const results = [{ rating: "easy" }, { rating: "easy" }];
    expect(computeOverallScore(results)).toBe(1);
  });

  it("computes correct score for mixed ratings", () => {
    // wrong=0, hard=1, good=2, easy=3
    // total = 0+1+2+3 = 6, max = 4*3 = 12, score = 0.5
    const results = [
      { rating: "wrong" },
      { rating: "hard" },
      { rating: "good" },
      { rating: "easy" },
    ];
    expect(computeOverallScore(results)).toBe(0.5);
  });
});

describe("RATING_SCORES", () => {
  it("has scores for all ratings", () => {
    expect(RATING_SCORES.wrong).toBe(0);
    expect(RATING_SCORES.hard).toBe(1);
    expect(RATING_SCORES.good).toBe(2);
    expect(RATING_SCORES.easy).toBe(3);
  });
});

describe("studySessions.start", () => {
  it("creates a session with correct card order", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 3);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    expect(session).not.toBeNull();
    expect(session!.cardOrder).toHaveLength(3);
    expect(session!.currentIndex).toBe(0);
    expect(session!.status).toBe("in_progress");
  });

  it("applies cardLimit", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 5);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
      cardLimit: 2,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    expect(session!.cardOrder).toHaveLength(2);
  });

  it("rejects empty frontFields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    await expect(
      as.mutation(api.studySessions.start, {
        setId,
        frontFields: [],
        backFields: ["Back"],
        shuffle: false,
      })
    ).rejects.toThrow("frontFields must not be empty");
  });

  it("rejects invalid field names", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    await expect(
      as.mutation(api.studySessions.start, {
        setId,
        frontFields: ["NonExistent"],
        backFields: ["Back"],
        shuffle: false,
      })
    ).rejects.toThrow("Invalid front field: NonExistent");
  });

  it("rejects empty set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await as.mutation(api.flashcardSets.create, {
      name: "Empty",
      fieldDefinitions: fieldDefs,
    });

    await expect(
      as.mutation(api.studySessions.start, {
        setId,
        frontFields: ["Front"],
        backFields: ["Back"],
        shuffle: false,
      })
    ).rejects.toThrow("No cards in this set");
  });
});

describe("studySessions.recordResult", () => {
  it("advances currentIndex", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    const { isComplete } = await as.mutation(
      api.studySessions.recordResult,
      {
        sessionId,
        cardId: session!.cardOrder[0],
        rating: "good",
      }
    );
    expect(isComplete).toBe(false);

    const updated = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    expect(updated!.currentIndex).toBe(1);
  });

  it("completes session and computes score on last card", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    const { isComplete } = await as.mutation(
      api.studySessions.recordResult,
      {
        sessionId,
        cardId: session!.cardOrder[0],
        rating: "easy",
      }
    );
    expect(isComplete).toBe(true);

    const completed = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    expect(completed!.status).toBe("completed");
    expect(completed!.overallScore).toBe(1); // easy = 3/3
  });

  it("rejects wrong cardId", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    // Try to submit result for card at index 1 when we're at index 0
    await expect(
      as.mutation(api.studySessions.recordResult, {
        sessionId,
        cardId: session!.cardOrder[1],
        rating: "good",
      })
    ).rejects.toThrow("cardId does not match");
  });

  it("rejects recording result on abandoned session", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    await as.mutation(api.studySessions.abandon, { sessionId });

    await expect(
      as.mutation(api.studySessions.recordResult, {
        sessionId,
        cardId: session!.cardOrder[0],
        rating: "good",
      })
    ).rejects.toThrow("Session is not active");
  });
});

describe("studySessions.abandon", () => {
  it("sets status to abandoned", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    await as.mutation(api.studySessions.abandon, { sessionId });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    expect(session!.status).toBe("abandoned");
  });

  it("rejects abandoning a completed session", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });

    await expect(
      as.mutation(api.studySessions.abandon, { sessionId })
    ).rejects.toThrow("Session is not active");
  });
});

describe("studySessions.getActiveSession", () => {
  it("returns only in-progress sessions", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    // Create and abandon one session
    const abandonedId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });
    await as.mutation(api.studySessions.abandon, {
      sessionId: abandonedId,
    });

    // Create an active session
    const activeId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    });

    const active = await as.query(api.studySessions.getActiveSession, {
      setId,
    });
    expect(active).not.toBeNull();
    expect(active!._id).toBe(activeId);
  });

  it("returns null when no active sessions", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const active = await as.query(api.studySessions.getActiveSession, {
      setId,
    });
    expect(active).toBeNull();
  });
});

describe("studySessions.start — ttsOnlyFields", () => {
  it("accepts ttsOnlyFields for TTS-capable fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Pinyin"],
      backFields: ["Meaning"],
      ttsOnlyFields: ["Character"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, { id: sessionId });
    expect(session!.ttsOnlyFields).toEqual(["Character"]);
  });

  it("works without ttsOnlyFields (backward compat)", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    const sessionId = await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Character"],
      backFields: ["Meaning"],
      shuffle: false,
    });

    const session = await as.query(api.studySessions.get, { id: sessionId });
    expect(session!.ttsOnlyFields).toEqual([]);
  });

  it("rejects fields without TTS config in ttsOnlyFields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    await expect(
      as.mutation(api.studySessions.start, {
        setId,
        frontFields: ["Character"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["Pinyin"],
        shuffle: false,
      })
    ).rejects.toThrow('Field "Pinyin" has no TTS config');
  });

  it("rejects fields appearing in both ttsOnlyFields and frontFields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    await expect(
      as.mutation(api.studySessions.start, {
        setId,
        frontFields: ["Character"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["Character"],
        shuffle: false,
      })
    ).rejects.toThrow('Field "Character" cannot be in both');
  });

  it("rejects invalid field names in ttsOnlyFields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    await expect(
      as.mutation(api.studySessions.start, {
        setId,
        frontFields: ["Character"],
        backFields: ["Meaning"],
        ttsOnlyFields: ["NonExistent"],
        shuffle: false,
      })
    ).rejects.toThrow("Invalid TTS-only field: NonExistent");
  });
});
