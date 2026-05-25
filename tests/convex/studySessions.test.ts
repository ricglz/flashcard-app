import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import { computeOverallScore } from "../../src/lib/studyResults";
import { CARD_RATING_SCORES } from "../../src/lib/types";
import {
  createSetWithCards as createSharedSetWithCards,
  createTestDb,
  getStudySession,
  unwrap,
  TEST_USER,
  fieldDefs,
  fieldDefsWithTts,
} from "./helpers";
import type { Id } from "../../convex/_generated/dataModel";
import type { TestDb, TestIdentity } from "./testTypes";

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function createSetWithCards(
  as: TestIdentity,
  cardCount: number,
  defs = fieldDefs
) {
  const { setId } = await createSharedSetWithCards(as, {
    cardCount,
    fieldDefinitions: defs,
  });
  return setId;
}

async function getCardResults(t: TestDb, sessionId: Id<"studySessions">) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("cardResults")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .take(1000);
  });
}

describe("studySessions.get", () => {
  it("returns Unauthenticated without identity", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const result = await t.query(api.studySessions.get, { id: sessionId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("returns NotFound for missing sessions", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));
    await t.run(async (ctx) => {
      await ctx.db.delete(sessionId);
    });

    const result = await as.query(api.studySessions.get, { id: sessionId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns NotFound for another user's session", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const result = await other.query(api.studySessions.get, { id: sessionId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns the session for the owner", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const result = await as.query(api.studySessions.get, { id: sessionId });

    expect(result).toMatchObject({ ok: true, value: { _id: sessionId } });
  });
});

describe("studySessions.getResults", () => {
  it("returns Unauthenticated without identity", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const result = await t.query(api.studySessions.getResults, { sessionId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("returns NotFound for missing sessions", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));
    await t.run(async (ctx) => {
      await ctx.db.delete(sessionId);
    });

    const result = await as.query(api.studySessions.getResults, { sessionId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns NotFound for another user's session", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const result = await other.query(api.studySessions.getResults, { sessionId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns session and results for the owner", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));
    const session = await getStudySession(as, sessionId);
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session.cardOrder[0]!,
      rating: "good",
    });

    const result = await as.query(api.studySessions.getResults, { sessionId });

    expect(result).toMatchObject({
      ok: true,
      value: {
        session: { _id: sessionId },
        results: [{ rating: "good" }],
      },
    });
  });
});

describe("computeOverallScore", () => {
  it("returns 0 for empty results", () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it("returns 0 for all wrong", () => {
    const results = [{ rating: "wrong" }, { rating: "wrong" }] as const;
    expect(computeOverallScore(results)).toBe(0);
  });

  it("returns 1 for all easy", () => {
    const results = [{ rating: "easy" }, { rating: "easy" }] as const;
    expect(computeOverallScore(results)).toBe(1);
  });

  it("computes correct score for mixed ratings", () => {
    const results = [
      { rating: "wrong" },
      { rating: "hard" },
      { rating: "good" },
      { rating: "easy" },
    ] as const;
    expect(computeOverallScore(results)).toBe(0.5);
  });
});

describe("CARD_RATING_SCORES", () => {
  it("has scores for all ratings", () => {
    expect(CARD_RATING_SCORES.wrong).toBe(0);
    expect(CARD_RATING_SCORES.hard).toBe(1);
    expect(CARD_RATING_SCORES.good).toBe(2);
    expect(CARD_RATING_SCORES.easy).toBe(3);
  });
});

describe("studySessions.start", () => {
  it("creates a session with correct card order", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 3);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    expect(session).not.toBeNull();
    expect(session!.cardOrder).toHaveLength(3);
    expect(session!.currentIndex).toBe(0);
    expect(session!.status).toBe("in_progress");
  });

  it("applies cardLimit", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 5);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
      cardLimit: 2,
    }));

    const session = await getStudySession(as, sessionId);
    expect(session!.cardOrder).toHaveLength(2);
  });

  it("rejects invalid cardLimit values", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 5);

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
      cardLimit: 0,
    })).toMatchObject({ ok: false, error: { message: "cardLimit must be an integer between 1 and 1000" } });

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
      cardLimit: 1.5,
    })).toMatchObject({ ok: false, error: { message: "cardLimit must be an integer between 1 and 1000" } });

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
      cardLimit: 1001,
    })).toMatchObject({ ok: false, error: { message: "cardLimit must be an integer between 1 and 1000" } });
  });

  it("returns existing active session instead of creating a duplicate", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 3);

    const firstSessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const secondSessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Back"],
      backFields: ["Front"],
      shuffle: true,
      cardLimit: 1,
    }));

    expect(secondSessionId).toBe(firstSessionId);

    const active = await as.query(api.studySessions.getActiveSession, {
      setId,
    });
    expect(active?._id).toBe(firstSessionId);
    expect(active?.frontFields).toEqual(["Front"]);
    expect(active?.backFields).toEqual(["Back"]);
  });

  it("rejects empty frontFields", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: [],
      backFields: ["Back"],
      shuffle: false,
    })).toMatchObject({ ok: false, error: { message: "frontFields must not be empty" } });
  });

  it("rejects invalid field names", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["NonExistent"],
      backFields: ["Back"],
      shuffle: false,
    })).toMatchObject({ ok: false, error: { message: "Invalid front field: NonExistent" } });
  });

  it("rejects empty set", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Empty",
      fieldDefinitions: fieldDefs,
    }));

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    })).toMatchObject({ ok: false, error: { message: "No cards in this set" } });
  });
});

describe("studySessions.recordResult", () => {
  it("advances currentIndex", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    const { isComplete } = await unwrap(await as.mutation(
      api.studySessions.recordResult,
      {
        sessionId,
        cardId: session!.cardOrder[0]!,
        rating: "good",
      }
    ));
    expect(isComplete).toBe(false);

    const updated = await getStudySession(as, sessionId);
    expect(updated!.currentIndex).toBe(1);
  });

  it("completes session and computes score on last card", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    const { isComplete } = await unwrap(await as.mutation(
      api.studySessions.recordResult,
      {
        sessionId,
        cardId: session!.cardOrder[0]!,
        rating: "easy",
      }
    ));
    expect(isComplete).toBe(true);

    const completed = await getStudySession(as, sessionId);
    expect(completed!.status).toBe("completed");
    expect(completed!.overallScore).toBe(1); // easy = 3/3
  });

  it("rejects wrong cardId", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    expect(await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[1]!,
      rating: "good",
    })).toMatchObject({ ok: false, error: { message: "cardId does not match the current card in the session" } });
  });

  it("treats replay for an already recorded card as a duplicate", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0]!,
      rating: "good",
    });

    const replay = await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0]!,
      rating: "easy",
    });

    expect(replay).toEqual({
      ok: true,
      value: { isComplete: false, outcome: "duplicate" },
    });
    const results = await getCardResults(t, sessionId);
    expect(results).toHaveLength(1);
    expect(results[0]!.rating).toBe("good");
    const updated = await getStudySession(as, sessionId);
    expect(updated!.currentIndex).toBe(1);
  });

  it("replays ordered queued results and completes the session", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0]!,
      rating: "wrong",
    });
    const completedResult = await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[1]!,
      rating: "easy",
    });

    expect(completedResult).toMatchObject({
      ok: true,
      value: { isComplete: true, outcome: "recorded" },
    });
    const results = await getCardResults(t, sessionId);
    expect(results).toHaveLength(2);
    const completed = await getStudySession(as, sessionId);
    expect(completed!.status).toBe("completed");
    expect(completed!.currentIndex).toBe(2);
    expect(completed!.overallScore).toBe(0.5);
  });

  it("rejects recording result on abandoned session", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 2);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    await as.mutation(api.studySessions.abandon, { sessionId });

    expect(await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0]!,
      rating: "good",
    })).toMatchObject({ ok: true, value: { outcome: "alreadyComplete" } });
  });
});

describe("studySessions.abandon", () => {
  it("sets status to abandoned", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    await as.mutation(api.studySessions.abandon, { sessionId });

    const session = await getStudySession(as, sessionId);
    expect(session!.status).toBe("abandoned");
  });

  it("rejects abandoning a completed session", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0]!,
      rating: "good",
    });

    expect(await as.mutation(api.studySessions.abandon, { sessionId })).toMatchObject({ ok: true, value: { outcome: "alreadyClosed" } });
  });
});

describe("studySessions.getActiveSession", () => {
  it("returns only in-progress sessions", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const abandonedId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));
    await as.mutation(api.studySessions.abandon, {
      sessionId: abandonedId,
    });

    const activeId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const active = await as.query(api.studySessions.getActiveSession, {
      setId,
    });
    expect(active).not.toBeNull();
    expect(active!._id).toBe(activeId);
  });

  it("returns null when no active sessions", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const active = await as.query(api.studySessions.getActiveSession, {
      setId,
    });
    expect(active).toBeNull();
  });

  it("finds an active session after many historical sessions", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    for (let i = 0; i < 60; i++) {
      const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
        setId,
        frontFields: ["Front"],
        backFields: ["Back"],
        shuffle: false,
      }));
      await as.mutation(api.studySessions.abandon, { sessionId });
    }

    const activeId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const active = await as.query(api.studySessions.getActiveSession, {
      setId,
    });
    expect(active).not.toBeNull();
    expect(active!._id).toBe(activeId);
    expect(active!.status).toBe("in_progress");
  });
});

describe("studySessions.getActiveById", () => {
  it("returns only an in-progress session by ID", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    const active = await as.query(api.studySessions.getActiveById, { id: sessionId });
    expect(active).not.toBeNull();
    expect(active!.status).toBe("in_progress");

    await as.mutation(api.studySessions.abandon, { sessionId });

    const abandoned = await as.query(api.studySessions.getActiveById, { id: sessionId });
    expect(abandoned).toBeNull();
  });
});

describe("studySessions.start — ttsOnlyFields", () => {
  it("accepts ttsOnlyFields for TTS-capable fields", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Pinyin"],
      backFields: ["Meaning"],
      ttsOnlyFields: ["Character"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    expect(session!.ttsOnlyFields).toEqual(["Character"]);
  });

  it("works without ttsOnlyFields (backward compat)", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Character"],
      backFields: ["Meaning"],
      shuffle: false,
    }));

    const session = await getStudySession(as, sessionId);
    expect(session!.ttsOnlyFields).toEqual([]);
  });

  it("rejects fields without TTS config in ttsOnlyFields", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Character"],
      backFields: ["Meaning"],
      ttsOnlyFields: ["Pinyin"],
      shuffle: false,
    })).toMatchObject({ ok: false, error: { message: 'Field "Pinyin" has no TTS config and cannot be TTS-only' } });
  });

  it("rejects fields appearing in both ttsOnlyFields and frontFields", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Character"],
      backFields: ["Meaning"],
      ttsOnlyFields: ["Character"],
      shuffle: false,
    })).toMatchObject({ ok: false, error: { message: 'Field "Character" cannot be in both ttsOnlyFields and front/back' } });
  });

  it("rejects invalid field names in ttsOnlyFields", async () => {
    const t = createTestDb();
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as, 1, fieldDefsWithTts);

    expect(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Character"],
      backFields: ["Meaning"],
      ttsOnlyFields: ["NonExistent"],
      shuffle: false,
    })).toMatchObject({ ok: false, error: { message: "Invalid TTS-only field: NonExistent" } });
  });
});
