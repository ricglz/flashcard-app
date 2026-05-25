import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { validateSetFields } from "../../convex/domain/fieldDefinitions";
import { getStudySession, unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { TestDb } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");


const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

describe("validateSetFields", () => {
  it("returns ok for valid inputs", () => {
    const result = validateSetFields("My Set", [{ name: "Front" }, { name: "Back" }]);
    expect(result.ok).toBe(true);
  });

  it("fails for empty name", () => {
    const result = validateSetFields("", undefined);
    expect(result).toMatchObject({ ok: false, error: { _tag: "EmptySetName" } });
  });

  it("fails for whitespace-only name", () => {
    const result = validateSetFields("   ", undefined);
    expect(result).toMatchObject({ ok: false, error: { _tag: "EmptySetName" } });
  });

  it("fails for empty fieldDefinitions array", () => {
    const result = validateSetFields(undefined, []);
    expect(result).toMatchObject({ ok: false, error: { _tag: "MissingFieldDefinitions" } });
  });

  it("fails for empty field name", () => {
    const result = validateSetFields(undefined, [{ name: "" }]);
    expect(result).toMatchObject({ ok: false, error: { _tag: "EmptyFieldName" } });
  });

  it("fails for duplicate field names", () => {
    const result = validateSetFields(undefined, [{ name: "A" }, { name: "A" }]);
    expect(result).toMatchObject({ ok: false, error: { _tag: "DuplicateFieldName" } });
  });

  it("returns ok when args are undefined", () => {
    const result = validateSetFields(undefined, undefined);
    expect(result.ok).toBe(true);
  });
});

describe("flashcardSets.create", () => {
  it("creates a set with correct fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test Set",
      fieldDefinitions: fieldDefs,
    }));
    expect(id).toBeDefined();

    const result = await as.query(api.flashcardSets.get, { id });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.name).toBe("Test Set");
    expect(set.fieldDefinitions).toHaveLength(2);
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.flashcardSets.create, {
      name: "Test",
      fieldDefinitions: fieldDefs,
    });
    expect(result).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("rejects empty name", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const result = await as.mutation(api.flashcardSets.create, {
      name: "",
      fieldDefinitions: fieldDefs,
    });
    expect(result).toMatchObject({ ok: false, error: { message: "Set name must not be empty" } });
  });
});

describe("flashcardSets.update", () => {
  it("updates the set name", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Original",
      fieldDefinitions: fieldDefs,
    }));

    await as.mutation(api.flashcardSets.update, { id, name: "Updated" });

    const result = await as.query(api.flashcardSets.get, { id });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.name).toBe("Updated");
  });

  it("rejects non-owner", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test",
      fieldDefinitions: fieldDefs,
    }));

    const result = await other.mutation(api.flashcardSets.update, { id, name: "Hacked" });
    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });
});

describe("flashcardSets.get visibility gating", () => {
  it("returns Unauthenticated when there is no identity", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Public Set",
      fieldDefinitions: fieldDefs,
    }));
    await as.mutation(api.flashcardSets.updateVisibility, { id, visibility: "public" });

    const result = await t.query(api.flashcardSets.get, { id });
    expect(result).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("returns NotFound for a missing set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Deleted Set",
      fieldDefinitions: fieldDefs,
    }));
    await as.mutation(api.flashcardSets.remove, { id });

    const result = await as.query(api.flashcardSets.get, { id });
    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns Forbidden for private set when viewer is non-member", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Private Set",
      fieldDefinitions: fieldDefs,
    }));

    const result = await other.query(api.flashcardSets.get, { id });
    expect(result).toMatchObject({ ok: false, error: { _tag: "Forbidden" } });
  });

  it("returns public set for non-member with visitor role", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Public Set",
      fieldDefinitions: fieldDefs,
    }));
    await as.mutation(api.flashcardSets.updateVisibility, { id, visibility: "public" });

    const result = await other.query(api.flashcardSets.get, { id });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.viewer.role).toBe("visitor");
  });

  it("returns unlisted set for non-member with visitor role", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Unlisted Set",
      fieldDefinitions: fieldDefs,
    }));
    await as.mutation(api.flashcardSets.updateVisibility, { id, visibility: "unlisted" });

    const result = await other.query(api.flashcardSets.get, { id });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.viewer.role).toBe("visitor");
  });

  it("returns private set for owner", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Private Set",
      fieldDefinitions: fieldDefs,
    }));

    const result = await as.query(api.flashcardSets.get, { id });
    expect(result.ok).toBe(true);
    const set = await unwrap(result);
    expect(set.viewer.role).toBe("owner");
  });
});

describe("flashcardSets.remove", () => {
  it("deletes set, cards, sessions, and results", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test",
      fieldDefinitions: fieldDefs,
    }));
    await as.mutation(api.flashcards.batchCreate, {
      setId,
      cards: [
        { fields: { Front: "A", Back: "B" }, order: 0 },
        { fields: { Front: "C", Back: "D" }, order: 1 },
      ],
    });

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

    await as.mutation(api.flashcardSets.remove, { id: setId });

    const deletedSet = await as.query(api.flashcardSets.get, {
      id: setId,
    });
    expect(deletedSet).toMatchObject({ ok: false, error: { _tag: "NotFound" } });

    const cards = await as.query(api.flashcards.list, { setId });
    expect(cards).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });
});

describe("flashcardSets.fork", () => {
  async function createPublicSetWithCards(t: TestDb) {
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Original Set",
      fieldDefinitions: fieldDefs,
    }));
    await unwrap(await as.mutation(api.flashcardSets.updateVisibility, {
      id: setId,
      visibility: "public",
    }));
    await as.mutation(api.flashcards.batchCreate, {
      setId,
      cards: [
        { fields: { Front: "Hello", Back: "World" }, order: 0 },
        { fields: { Front: "Foo", Back: "Bar" }, order: 1 },
      ],
    });
    return setId;
  }

  it("forks a public set with correct name, origin, cards, and cardCount", async () => {
    const t = convexTest(schema, modules);
    const sourceSetId = await createPublicSetWithCards(t);
    const other = t.withIdentity(OTHER_USER);

    const result = await other.mutation(api.flashcardSets.fork, { sourceSetId });
    expect(result).toMatchObject({ ok: true });
    const newSetId = await unwrap(result);

    const forkedSet = await other.query(api.flashcardSets.get, { id: newSetId });
    expect(forkedSet.ok).toBe(true);
    const set = await unwrap(forkedSet);
    expect(set.name).toBe("Copy of Original Set");
    expect(set.fieldDefinitions).toHaveLength(2);
    expect(set.cardCount).toBe(2);
    expect(set.origin).toMatchObject({ kind: "forked", sourceSetId });

    const cards = await unwrap(await other.query(api.flashcards.list, { setId: newSetId }));
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.origin)).toEqual(["forked", "forked"]);
  });

  it("forks an unlisted set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Unlisted",
      fieldDefinitions: fieldDefs,
    }));
    await as.mutation(api.flashcardSets.updateVisibility, { id: setId, visibility: "unlisted" });

    const other = t.withIdentity(OTHER_USER);
    const result = await other.mutation(api.flashcardSets.fork, { sourceSetId: setId });
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects forking a private set by non-member", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Private",
      fieldDefinitions: fieldDefs,
    }));

    const other = t.withIdentity(OTHER_USER);
    const result = await other.mutation(api.flashcardSets.fork, { sourceSetId: setId });
    expect(result).toMatchObject({ ok: false, error: { _tag: "Forbidden" } });
  });

  it("allows member to fork a private set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Private Shared",
      fieldDefinitions: fieldDefs,
    }));

    const other = t.withIdentity(OTHER_USER);
    await other.mutation(api.sharing.addToLibrary, { setId });

    const t2 = convexTest(schema, modules);
    const owner = t2.withIdentity(TEST_USER);
    const member = t2.withIdentity(OTHER_USER);

    const id = await unwrap(await owner.mutation(api.flashcardSets.create, {
      name: "Was Public",
      fieldDefinitions: fieldDefs,
    }));
    await owner.mutation(api.flashcardSets.updateVisibility, { id, visibility: "public" });
    await member.mutation(api.sharing.addToLibrary, { setId: id });
    await owner.mutation(api.flashcardSets.updateVisibility, { id, visibility: "private" });

    const result = await member.mutation(api.flashcardSets.fork, { sourceSetId: id });
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects forking own set", async () => {
    const t = convexTest(schema, modules);
    const sourceSetId = await createPublicSetWithCards(t);
    const as = t.withIdentity(TEST_USER);

    const result = await as.mutation(api.flashcardSets.fork, { sourceSetId });
    expect(result).toMatchObject({ ok: false, error: { _tag: "Conflict" } });
  });

  it("creates owner userSet link and enrolls SRS cards", async () => {
    const t = convexTest(schema, modules);
    const sourceSetId = await createPublicSetWithCards(t);
    const other = t.withIdentity(OTHER_USER);

    const result = await other.mutation(api.flashcardSets.fork, { sourceSetId });
    const newSetId = await unwrap(result);

    const userSet = await other.query(api.userSets.get, { setId: newSetId });
    expect(userSet).not.toBeNull();
    expect(userSet!.role).toBe("owner");

    const srsCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("srsCards")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", OTHER_USER.tokenIdentifier).eq("setId", newSetId)
        )
        .take(100);
    });
    expect(srsCards).toHaveLength(2);
  });
});
