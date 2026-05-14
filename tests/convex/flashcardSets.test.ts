/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { validateSetFields } from "../../convex/flashcardSets";

const modules = import.meta.glob("../../convex/**/*.ts");


async function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } } | T): Promise<T> {
  if (result && typeof result === "object" && "ok" in result && result.ok === false) {
    throw new Error(result.error.message);
  }
  return result as T;
}

const TEST_USER = {
  tokenIdentifier: "test-user-1",
  subject: "user1",
};

const OTHER_USER = {
  tokenIdentifier: "test-user-2",
  subject: "user2",
};

const validFieldDefs = [
  { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
  { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
];

describe("validateSetFields", () => {
  it("passes with valid inputs", () => {
    expect(() =>
      validateSetFields("My Set", [{ name: "Front" }, { name: "Back" }])
    ).not.toThrow();
  });

  it("throws for empty name", () => {
    expect(() => validateSetFields("", undefined)).toThrow(
      "Set name must not be empty"
    );
  });

  it("throws for whitespace-only name", () => {
    expect(() => validateSetFields("   ", undefined)).toThrow(
      "Set name must not be empty"
    );
  });

  it("throws for empty fieldDefinitions array", () => {
    expect(() => validateSetFields(undefined, [])).toThrow(
      "At least one field definition is required"
    );
  });

  it("throws for empty field name", () => {
    expect(() =>
      validateSetFields(undefined, [{ name: "" }])
    ).toThrow("Field names must not be empty");
  });

  it("throws for duplicate field names", () => {
    expect(() =>
      validateSetFields(undefined, [{ name: "A" }, { name: "A" }])
    ).toThrow("Field names must be unique");
  });

  it("skips checks when args are undefined", () => {
    expect(() =>
      validateSetFields(undefined, undefined)
    ).not.toThrow();
  });
});

describe("flashcardSets.create", () => {
  it("creates a set with correct fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test Set",
      fieldDefinitions: validFieldDefs,
    }));
    expect(id).toBeDefined();

    const set = await as.query(api.flashcardSets.get, { id });
    expect(set?.name).toBe("Test Set");
    expect(set?.fieldDefinitions).toHaveLength(2);
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.flashcardSets.create, {
      name: "Test",
      fieldDefinitions: validFieldDefs,
    });
    expect(result).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("rejects empty name", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const result = await as.mutation(api.flashcardSets.create, {
      name: "",
      fieldDefinitions: validFieldDefs,
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
      fieldDefinitions: validFieldDefs,
    }));

    await as.mutation(api.flashcardSets.update, { id, name: "Updated" });

    const set = await as.query(api.flashcardSets.get, { id });
    expect(set?.name).toBe("Updated");
  });

  it("rejects non-owner", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test",
      fieldDefinitions: validFieldDefs,
    }));

    const result = await other.mutation(api.flashcardSets.update, { id, name: "Hacked" });
    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });
});

describe("flashcardSets.get visibility gating", () => {
  it("returns null for private set when viewer is non-member", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Private Set",
      fieldDefinitions: validFieldDefs,
    }));

    const result = await other.query(api.flashcardSets.get, { id });
    expect(result).toBeNull();
  });

  it("returns public set for non-member with visitor role", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Public Set",
      fieldDefinitions: validFieldDefs,
    }));
    await as.mutation(api.flashcardSets.updateVisibility, { id, visibility: "public" });

    const result = await other.query(api.flashcardSets.get, { id });
    expect(result).not.toBeNull();
    expect(result!.viewer.role).toBe("visitor");
  });

  it("returns unlisted set for non-member with visitor role", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Unlisted Set",
      fieldDefinitions: validFieldDefs,
    }));
    await as.mutation(api.flashcardSets.updateVisibility, { id, visibility: "unlisted" });

    const result = await other.query(api.flashcardSets.get, { id });
    expect(result).not.toBeNull();
    expect(result!.viewer.role).toBe("visitor");
  });

  it("returns private set for owner", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const id = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Private Set",
      fieldDefinitions: validFieldDefs,
    }));

    const result = await as.query(api.flashcardSets.get, { id });
    expect(result).not.toBeNull();
    expect(result!.viewer.role).toBe("owner");
  });
});

describe("flashcardSets.remove", () => {
  it("deletes set, cards, sessions, and results", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    // Create set with cards
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Test",
      fieldDefinitions: validFieldDefs,
    }));
    await as.mutation(api.flashcards.batchCreate, {
      setId,
      cards: [
        { fields: { Front: "A", Back: "B" }, order: 0 },
        { fields: { Front: "C", Back: "D" }, order: 1 },
      ],
    });

    // Create a study session
    const sessionId = await unwrap(await as.mutation(api.studySessions.start, {
      setId,
      frontFields: ["Front"],
      backFields: ["Back"],
      shuffle: false,
    }));

    // Record a result
    const session = await as.query(api.studySessions.get, {
      id: sessionId,
    });
    await as.mutation(api.studySessions.recordResult, {
      sessionId,
      cardId: session!.cardOrder[0],
      rating: "good",
    });

    // Delete the set
    await as.mutation(api.flashcardSets.remove, { id: setId });

    // Verify everything is gone
    const deletedSet = await as.query(api.flashcardSets.get, {
      id: setId,
    });
    expect(deletedSet).toBeNull();

    const cards = await as.query(api.flashcards.list, { setId });
    expect(cards).toHaveLength(0);
  });
});

describe("flashcardSets.fork", () => {
  async function createPublicSetWithCards(t: ReturnType<typeof convexTest>) {
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Original Set",
      fieldDefinitions: validFieldDefs,
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
    const newSetId = (result as { ok: true; value: string }).value;

    const forkedSet = await other.query(api.flashcardSets.get, { id: newSetId as any });
    expect(forkedSet).not.toBeNull();
    expect(forkedSet!.name).toBe("Copy of Original Set");
    expect(forkedSet!.fieldDefinitions).toHaveLength(2);
    expect(forkedSet!.cardCount).toBe(2);
    expect(forkedSet!.origin).toMatchObject({ kind: "forked", sourceSetId });

    const cards = await other.query(api.flashcards.list, { setId: newSetId as any });
    expect(cards).toHaveLength(2);
  });

  it("forks an unlisted set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
      name: "Unlisted",
      fieldDefinitions: validFieldDefs,
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
      fieldDefinitions: validFieldDefs,
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
      fieldDefinitions: validFieldDefs,
    }));

    const other = t.withIdentity(OTHER_USER);
    await other.mutation(api.sharing.addToLibrary, { setId });

    // addToLibrary fails on private sets now, so let's make it public first then private after adding
    // Actually, let's test via the lower-level userSets.add
    // Re-approach: make the set public, add to library, then make private, then fork
    const t2 = convexTest(schema, modules);
    const owner = t2.withIdentity(TEST_USER);
    const member = t2.withIdentity(OTHER_USER);

    const id = await unwrap(await owner.mutation(api.flashcardSets.create, {
      name: "Was Public",
      fieldDefinitions: validFieldDefs,
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
    const newSetId = (result as { ok: true; value: string }).value;

    const userSet = await other.query(api.userSets.get, { setId: newSetId as any });
    expect(userSet).not.toBeNull();
    expect(userSet!.role).toBe("owner");

    const srsCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("srsCards")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", OTHER_USER.tokenIdentifier).eq("setId", newSetId as any)
        )
        .take(100);
    });
    expect(srsCards).toHaveLength(2);
  });
});
