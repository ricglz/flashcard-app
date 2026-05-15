/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { unwrap, fieldDefs } from "./helpers";

const modules = import.meta.glob("../../convex/**/*.ts");


const OWNER = {
  tokenIdentifier: "test-owner",
  subject: "owner",
};

const VISITOR = {
  tokenIdentifier: "test-visitor",
  subject: "visitor",
};

async function createSetWithCards(t: ReturnType<typeof convexTest>) {
  const as = t.withIdentity(OWNER);
  const setId = await unwrap(await as.mutation(api.flashcardSets.create, {
    name: "Shared Set",
    fieldDefinitions: fieldDefs,
  }));
  await unwrap(await as.mutation(api.flashcardSets.updateVisibility, {
    id: setId,
    visibility: "public",
  }));
  await unwrap(await as.mutation(api.flashcards.batchCreate, {
    setId,
    cards: [
      { fields: { Front: "Hello", Back: "World" }, order: 0 },
      { fields: { Front: "Foo", Back: "Bar" }, order: 1 },
    ],
  }));
  return setId;
}

describe("flashcardSets.get viewer info", () => {
  it("returns owner role for the set creator", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);
    const as = t.withIdentity(OWNER);

    const result = await as.query(api.flashcardSets.get, { id: setId });
    expect(result).not.toBeNull();
    expect(result!.viewer.role).toBe("owner");
    expect(result!.viewer.userSet).not.toBeNull();
    expect(result!.viewer.userSet!.role).toBe("owner");
  });

  it("returns visitor role for a non-member", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);
    const as = t.withIdentity(VISITOR);

    const result = await as.query(api.flashcardSets.get, { id: setId });
    expect(result).not.toBeNull();
    expect(result!.viewer.role).toBe("visitor");
    expect(result!.viewer.userSet).toBeNull();
  });

  it("returns member role after addToLibrary", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);
    const as = t.withIdentity(VISITOR);

    await as.mutation(api.sharing.addToLibrary, { setId });

    const result = await as.query(api.flashcardSets.get, { id: setId });
    expect(result).not.toBeNull();
    expect(result!.viewer.role).toBe("member");
    expect(result!.viewer.userSet).not.toBeNull();
    expect(result!.viewer.userSet!.role).toBe("member");
  });

  it("returns null for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);

    const result = await t.query(api.flashcardSets.get, { id: setId });
    expect(result).toBeNull();
  });
});

describe("sharing.addToLibrary", () => {
  it("creates a member userSet link", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);
    const as = t.withIdentity(VISITOR);

    const userSetId = await as.mutation(api.sharing.addToLibrary, { setId });
    expect(userSetId).toBeDefined();

    const userSet = await as.query(api.userSets.get, { setId });
    expect(userSet).not.toBeNull();
    expect(userSet!.role).toBe("member");
    expect(userSet!.srsEnabled).toBe(true);
    expect(userSet!.defaultFrontFields).toEqual(["Front"]);
    expect(userSet!.defaultBackFields).toEqual(["Back"]);
  });

  it("enrolls SRS cards for the new member", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);
    const as = t.withIdentity(VISITOR);

    await as.mutation(api.sharing.addToLibrary, { setId });

    const srsCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("srsCards")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", VISITOR.tokenIdentifier).eq("setId", setId)
        )
        .take(100);
    });
    expect(srsCards).toHaveLength(2);
  });

  it("rejects duplicate add", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);
    const as = t.withIdentity(VISITOR);

    await as.mutation(api.sharing.addToLibrary, { setId });
    expect(await as.mutation(api.sharing.addToLibrary, { setId })).toMatchObject({ ok: false, error: { message: "Set already in library" } });
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const setId = await createSetWithCards(t);

    expect(await t.mutation(api.sharing.addToLibrary, { setId })).toMatchObject({ ok: false, error: { _tag: "Unauthenticated" } });
  });

  it("rejects nonexistent set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(VISITOR);

    await expect(
      as.mutation(api.sharing.addToLibrary, {
        setId: "k57enrm3xzfbxfg0bm7g2gnp1h78m2b0" as Id<"flashcardSets">,
      })
    ).rejects.toThrow();
  });
});
