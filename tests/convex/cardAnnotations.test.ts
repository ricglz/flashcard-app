import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { createSetWithCards, TEST_USER, unwrap } from "./helpers";

const modules = import.meta.glob("../../convex/**/*.ts");

async function createCardForAiNote() {
  const t = convexTest(schema, modules);
  const as = t.withIdentity(TEST_USER);
  const { setId, cards } = await createSetWithCards(as, { cardCount: 1 });
  const card = cards[0]!;
  return { as, card, setId };
}

describe("cardAnnotations.addAiNoteToCurrentCard", () => {
  it("creates a note when no annotation exists", async () => {
    const { as, card, setId } = await createCardForAiNote();

    const result = await as.mutation(api.cardAnnotations.addAiNoteToCurrentCard, {
      setId,
      cardId: card._id,
      note: "  A concise takeaway.  ",
    });

    expect(result).toMatchObject({ ok: true, value: { note: "A concise takeaway." } });
    const annotations = await as.query(api.cardAnnotations.getForSet, { setId });
    expect(annotations).toMatchObject([
      { cardId: card._id, setId, flagged: false, note: "A concise takeaway." },
    ]);
  });

  it("adds a note to an existing flagged annotation without unflagging it", async () => {
    const { as, card, setId } = await createCardForAiNote();
    await unwrap(await as.mutation(api.cardAnnotations.toggleFlag, {
      setId,
      cardId: card._id,
    }));

    await unwrap(await as.mutation(api.cardAnnotations.addAiNoteToCurrentCard, {
      setId,
      cardId: card._id,
      note: "Review this distinction.",
    }));

    const annotations = await as.query(api.cardAnnotations.getForSet, { setId });
    expect(annotations).toMatchObject([
      { cardId: card._id, flagged: true, note: "Review this distinction." },
    ]);
  });

  it("rejects when a note already exists", async () => {
    const { as, card, setId } = await createCardForAiNote();
    await unwrap(await as.mutation(api.cardAnnotations.setNote, {
      setId,
      cardId: card._id,
      note: "Existing note",
    }));

    const result = await as.mutation(api.cardAnnotations.addAiNoteToCurrentCard, {
      setId,
      cardId: card._id,
      note: "New note",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "This card already has a note." },
    });
  });

  it("rejects a card from a different set", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);
    const first = await createSetWithCards(as, { cardCount: 1 });
    const second = await createSetWithCards(as, { cardCount: 1 });

    const result = await as.mutation(api.cardAnnotations.addAiNoteToCurrentCard, {
      setId: first.setId,
      cardId: second.cards[0]!._id,
      note: "Wrong target.",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "Card not found." },
    });
  });

  it("rejects blank notes", async () => {
    const { as, card, setId } = await createCardForAiNote();

    const result = await as.mutation(api.cardAnnotations.addAiNoteToCurrentCard, {
      setId,
      cardId: card._id,
      note: "   ",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "Note must not be blank." },
    });
  });

  it("rejects notes longer than 500 characters", async () => {
    const { as, card, setId } = await createCardForAiNote();

    const result = await as.mutation(api.cardAnnotations.addAiNoteToCurrentCard, {
      setId,
      cardId: card._id,
      note: "x".repeat(501),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "Note must be 500 characters or fewer." },
    });
  });
});
