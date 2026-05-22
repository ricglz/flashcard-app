import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";
import { unwrap, TEST_USER, fieldDefs } from "./helpers";
import type { TestIdentity } from "./testTypes";

const modules = import.meta.glob("../../convex/**/*.ts");

async function createSet(
  as: TestIdentity,
): Promise<Id<"flashcardSets">> {
  return unwrap(await as.mutation(api.flashcardSets.create, {
    name: "Test Set",
    fieldDefinitions: fieldDefs,
  }));
}

describe("flashcards.create", () => {
  it("creates a card with known fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    const cardId = await unwrap(await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: "Question", Back: "Answer" },
      order: 0,
    }));

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    expect(cards).toHaveLength(1);
    expect(cards[0]!._id).toBe(cardId);
    expect(cards[0]!.fields).toEqual({ Front: "Question", Back: "Answer" });
  });

  it("allows missing defined fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    await unwrap(await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: "Question" },
      order: 0,
    }));

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    expect(cards[0]!.fields).toEqual({ Front: "Question" });
  });

  it("rejects unknown fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    const result = await as.mutation(api.flashcards.create, {
      setId,
      fields: { Frnot: "Question", Back: "Answer" },
      order: 0,
    });
    expect(result).toMatchObject({ ok: false, error: { message: "Unknown field: Frnot" } });
  });

  it("rejects empty or blank field values", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    const empty = await as.mutation(api.flashcards.create, {
      setId,
      fields: {},
      order: 0,
    });
    expect(empty).toMatchObject({ ok: false, error: { message: "At least one field value is required" } });

    const blank = await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: " ", Back: "\t" },
      order: 0,
    });
    expect(blank).toMatchObject({ ok: false, error: { message: "At least one field value is required" } });
  });
});

describe("flashcards.batchCreate", () => {
  it("rejects a batch containing an unknown field", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    const result = await as.mutation(api.flashcards.batchCreate, {
      setId,
      cards: [
        { fields: { Front: "Q1", Back: "A1" }, order: 0 },
        { fields: { Front: "Q2", Extra: "A2" }, order: 1 },
      ],
    });
    expect(result).toMatchObject({ ok: false, error: { message: "Unknown field: Extra" } });

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    expect(cards).toEqual([]);
  });

  it("rejects a batch containing only blank values", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    const result = await as.mutation(api.flashcards.batchCreate, {
      setId,
      cards: [
        { fields: { Front: "Q1", Back: "A1" }, order: 0 },
        { fields: { Front: "", Back: "   " }, order: 1 },
      ],
    });
    expect(result).toMatchObject({ ok: false, error: { message: "At least one field value is required" } });

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    expect(cards).toEqual([]);
  });
});

describe("flashcards.update", () => {
  it("rejects unknown fields", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);
    const cardId = await unwrap(await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: "Question", Back: "Answer" },
      order: 0,
    }));

    const result = await as.mutation(api.flashcards.update, {
      id: cardId,
      fields: { Front: "Updated", Extra: "Nope" },
    });
    expect(result).toMatchObject({ ok: false, error: { message: "Unknown field: Extra" } });
  });

  it("rejects updates with only blank values", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);
    const cardId = await unwrap(await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: "Question", Back: "Answer" },
      order: 0,
    }));

    const result = await as.mutation(api.flashcards.update, {
      id: cardId,
      fields: { Front: "", Back: " " },
    });
    expect(result).toMatchObject({ ok: false, error: { message: "At least one field value is required" } });
  });

  it("allows updating only the order", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);
    const cardId = await unwrap(await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: "Question", Back: "Answer" },
      order: 0,
    }));

    await unwrap(await as.mutation(api.flashcards.update, {
      id: cardId,
      order: 2,
    }));

    const cards = await unwrap(await as.query(api.flashcards.list, { setId }));
    expect(cards[0]!.order).toBe(2);
  });
});

describe("flashcards.list access control", () => {
  const OTHER_USER = {
    tokenIdentifier: "test-user-2",
    subject: "user2",
  };

  async function createSetWithCards(as: TestIdentity) {
    const setId = await createSet(as);
    await unwrap(await as.mutation(api.flashcards.create, {
      setId,
      fields: { Front: "Question", Back: "Answer" },
      order: 0,
    }));
    return setId;
  }

  it("allows the owner to read private cards", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as);

    const result = await as.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: true });
    expect(await unwrap(result)).toHaveLength(1);
  });

  it("allows a member to read cards", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(TEST_USER);
    const member = t.withIdentity(OTHER_USER);
    const setId = await createSetWithCards(owner);
    await unwrap(await owner.mutation(api.flashcardSets.updateVisibility, {
      id: setId,
      visibility: "public",
    }));
    await unwrap(await member.mutation(api.sharing.addToLibrary, { setId }));
    await unwrap(await owner.mutation(api.flashcardSets.updateVisibility, {
      id: setId,
      visibility: "private",
    }));

    const result = await member.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: true });
    expect(await unwrap(result)).toHaveLength(1);
  });

  it("allows authenticated visitors to read public cards", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(TEST_USER);
    const visitor = t.withIdentity(OTHER_USER);
    const setId = await createSetWithCards(owner);
    await unwrap(await owner.mutation(api.flashcardSets.updateVisibility, {
      id: setId,
      visibility: "public",
    }));

    const result = await visitor.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: true });
    expect(await unwrap(result)).toHaveLength(1);
  });

  it("allows authenticated visitors to read unlisted cards", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(TEST_USER);
    const visitor = t.withIdentity(OTHER_USER);
    const setId = await createSetWithCards(owner);
    await unwrap(await owner.mutation(api.flashcardSets.updateVisibility, {
      id: setId,
      visibility: "unlisted",
    }));

    const result = await visitor.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: true });
    expect(await unwrap(result)).toHaveLength(1);
  });

  it("returns Forbidden for a private non-member", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(TEST_USER);
    const other = t.withIdentity(OTHER_USER);
    const setId = await createSetWithCards(owner);

    const result = await other.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "Forbidden" } });
  });

  it("returns Unauthenticated for signed-out reads", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(owner);

    const result = await t.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("returns NotFound for a missing set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSetWithCards(as);
    await unwrap(await as.mutation(api.flashcardSets.remove, { id: setId }));

    const result = await as.query(api.flashcards.list, { setId });

    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns NotFound for an ID-shaped value that is not a valid Convex ID", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const result = await as.query(api.flashcards.list, {
      setId: "j0000000000000000000000000000000",
    });

    expect(result).toMatchObject({ ok: false, error: { _tag: "NotFound" } });
  });

  it("returns success with an empty array for an accessible empty set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const setId = await createSet(as);

    const result = await as.query(api.flashcards.list, { setId });

    expect(result).toEqual({ ok: true, value: [] });
  });
});
