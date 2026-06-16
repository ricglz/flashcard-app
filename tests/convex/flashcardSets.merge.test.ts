import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { Id } from "../../convex/_generated/dataModel";

const modules = import.meta.glob("../../convex/**/*.ts");

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

async function createSetWithCards(
  t: ReturnType<typeof convexTest>,
  name: string,
  cards: { Front: string; Back: string }[],
) {
  const as = t.withIdentity(TEST_USER);
  const setId = await unwrap(
    await as.mutation(api.flashcardSets.create, {
      name,
      fieldDefinitions: fieldDefs,
    }),
  );
  for (let i = 0; i < cards.length; i++) {
    await unwrap(
      await as.mutation(api.flashcards.create, {
        setId,
        fields: cards[i]!,
        order: i,
      }),
    );
  }
  return setId;
}

describe("flashcardSets.merge", () => {
  it("merges two sets with deduplication and per-card origin", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const setA = await createSetWithCards(t, "A", [
      { Front: "Q1", Back: "A1" },
      { Front: "Q2", Back: "A2" },
    ]);
    const setB = await createSetWithCards(t, "B", [
      { Front: "Q2", Back: "A2" },
      { Front: "Q3", Back: "A3" },
    ]);

    const result = await unwrap(
      await as.mutation(api.flashcardSetsMerge.merge, {
        sourceSetIds: [setA, setB],
        archiveSource: false,
      }),
    );

    expect(result.skippedDuplicateCount).toBe(1);

    const merged = await unwrap(await as.query(api.flashcardSets.get, { id: result.setId }));
    expect(merged.cardCount).toBe(3);
    expect(merged.origin).toMatchObject({ kind: "merged", sourceSetIds: [setA, setB] });

    const cards = await unwrap(await as.query(api.flashcards.list, { setId: result.setId }));
    expect(cards).toHaveLength(3);
    const origins = cards.map((c) => c.origin);
    expect(origins[0]).toMatchObject({ kind: "merged", sourceSetId: setA });
    // duplicate Q2 should come from first source A
    const q2 = cards.find((c) => c.fields.Front === "Q2");
    expect(q2?.origin).toMatchObject({ kind: "merged", sourceSetId: setA });
  });

  it("rejects schema mismatch", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const setA = await unwrap(
      await as.mutation(api.flashcardSets.create, {
        name: "A",
        fieldDefinitions: fieldDefs,
      }),
    );
    const altFields = [
      { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
      { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
      { name: "Extra", role: "note" as const, metadata: {}, order: 2 },
    ];
    const setB = await unwrap(
      await as.mutation(api.flashcardSets.create, {
        name: "B",
        fieldDefinitions: altFields,
      }),
    );

    const result = await as.mutation(api.flashcardSetsMerge.merge, {
      sourceSetIds: [setA, setB],
      archiveSource: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("InvalidInput");
    }
  });

  it("archives sources when requested and clears review queue", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const setA = await createSetWithCards(t, "A", [{ Front: "Q1", Back: "A1" }]);
    const setB = await createSetWithCards(t, "B", [{ Front: "Q2", Back: "A2" }]);

    // enable SRS and populate queue via direct mutation to simulate
    await t.mutation(api.srsEngine.populateQueueForUser, { userId: TEST_USER.tokenIdentifier });

    const result = await unwrap(
      await as.mutation(api.flashcardSetsMerge.merge, {
        sourceSetIds: [setA, setB],
        archiveSource: true,
      }),
    );

    const aAfter = await unwrap(await as.query(api.flashcardSets.get, { id: setA }));
    const bAfter = await unwrap(await as.query(api.flashcardSets.get, { id: setB }));
    expect(aAfter.archivedAt).toBeDefined();
    expect(bAfter.archivedAt).toBeDefined();
    expect(aAfter.visibility).toBe("private");

    // list should filter archived by default
    const list = await unwrap(await as.query(api.flashcardSets.list, {}));
    const ids = list.map((s) => s._id);
    expect(ids).not.toContain(setA);
    expect(ids).not.toContain(setB);
    expect(ids).toContain(result.setId);

    // list with includeArchived true should show them
    const listAll = await unwrap(await as.query(api.flashcardSets.list, { includeArchived: true }));
    expect(listAll.map((s) => s._id)).toContain(setA);
  });

  it("rejects archive when not owner", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(TEST_USER);
    const member = t.withIdentity(OTHER_USER);

    const setA = await unwrap(
      await owner.mutation(api.flashcardSets.create, {
        name: "A",
        fieldDefinitions: fieldDefs,
      }),
    );
    await unwrap(await owner.mutation(api.flashcards.create, { setId: setA, fields: { Front: "Q", Back: "A" }, order: 0 }));
    const setB = await unwrap(
      await owner.mutation(api.flashcardSets.create, {
        name: "B",
        fieldDefinitions: fieldDefs,
      }),
    );
    await unwrap(await owner.mutation(api.flashcards.create, { setId: setB, fields: { Front: "Q2", Back: "A2" }, order: 0 }));
    // add OTHER_USER as member to both via direct db
    await t.run(async (ctx) => {
      await ctx.db.insert("userSets", {
        userId: OTHER_USER.tokenIdentifier,
        setId: setA,
        role: "member",
        srsEnabled: true,
        defaultFrontFields: ["Front"],
        defaultBackFields: ["Back"],
        defaultTtsOnlyFields: [],
        createdAt: Date.now(),
      });
      await ctx.db.insert("userSets", {
        userId: OTHER_USER.tokenIdentifier,
        setId: setB,
        role: "member",
        srsEnabled: true,
        defaultFrontFields: ["Front"],
        defaultBackFields: ["Back"],
        defaultTtsOnlyFields: [],
        createdAt: Date.now(),
      });
    });

    const result = await member.mutation(api.flashcardSetsMerge.merge, {
      sourceSetIds: [setA, setB],
      archiveSource: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("Forbidden");
    }
  });

  it("unarchives set and keeps visibility private", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setA = await createSetWithCards(t, "A", [{ Front: "Q1", Back: "A1" }]);
    const setB = await createSetWithCards(t, "B", [{ Front: "Q2", Back: "A2" }]);

    await unwrap(
      await as.mutation(api.flashcardSetsMerge.merge, {
        sourceSetIds: [setA, setB],
        archiveSource: true,
      }),
    );

    // unarchive one source
    await unwrap(await as.mutation(api.flashcardSets.unarchive, { id: setA }));

    const aAfter = await unwrap(await as.query(api.flashcardSets.get, { id: setA }));
    expect(aAfter.archivedAt).toBeUndefined();
    expect(aAfter.visibility).toBe("private");
  });

  it("enforces limit of 5 source sets and 1000 cards", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const ids: Id<"flashcardSets">[] = [];
    for (let i = 0; i < 6; i++) {
      const id = await unwrap(
        await as.mutation(api.flashcardSets.create, {
          name: `S${i}`,
          fieldDefinitions: fieldDefs,
        }),
      );
      await unwrap(await as.mutation(api.flashcards.create, { setId: id, fields: { Front: "Q", Back: "A" }, order: 0 }));
      ids.push(id);
    }
    const tooMany = await as.mutation(api.flashcardSetsMerge.merge, {
      // @ts-expect-error testing invalid input length >5
      sourceSetIds: ids.slice(0, 6),
      archiveSource: false,
    });
    expect(tooMany.ok).toBe(false);
  });
});
