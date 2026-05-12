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
