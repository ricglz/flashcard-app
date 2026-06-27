import { describe, expect, it } from "vitest";
import type { GeneratedSetPayload } from "./aiToolingSchemas";
import {
  editDraftCardField,
  generatedCardsFromPayload,
  includedCardFields,
  selectedCardsForAppend,
  selectedCardsForConfirm,
  toggleDraftCardSelection,
} from "./generatedDraftCards";
import { parseId } from "./convexHelpers";

const sourceSetId = parseId<"flashcardSets">("abc123def456ghi7");
const sourceCardId = parseId<"flashcards">("abc123def456ghi8");
if (sourceSetId === null || sourceCardId === null) {
  throw new Error("Invalid test Convex ID.");
}

const payload: GeneratedSetPayload = {
  name: "Generated",
  description: "Generated cards",
  sourceSetIds: [sourceSetId],
  sourceScope: "custom",
  weakContextMethodology: "balanced",
  fieldDefinitions: [
    { name: "Front", role: "primary", metadata: {}, order: 0 },
    { name: "Back", role: "definition", metadata: {}, order: 1 },
  ],
  cards: [
    {
      fields: { Front: "hola", Back: "hello" },
      tokenAnnotations: {
        Front: [{ start: 0, end: 4, gloss: "hello" }],
      },
      sourceCardIds: [sourceCardId],
      rationale: "Common greeting",
    },
    {
      fields: { Front: "adios", Back: "goodbye" },
      rationale: "Common farewell",
    },
  ],
  addToSrs: true,
};

describe("generated draft cards", () => {
  it("maps payload cards to selected draft cards without sharing field objects", () => {
    const cards = generatedCardsFromPayload(payload);

    expect(cards).toEqual([
      {
        fields: { Front: "hola", Back: "hello" },
        tokenAnnotations: {
          Front: [{ start: 0, end: 4, gloss: "hello" }],
        },
        sourceCardIds: [sourceCardId],
        rationale: "Common greeting",
        selected: true,
      },
      {
        fields: { Front: "adios", Back: "goodbye" },
        rationale: "Common farewell",
        selected: true,
      },
    ]);
    expect(cards[0]?.fields).not.toBe(payload.cards[0]?.fields);
    expect(cards[0]?.tokenAnnotations?.Front).not.toBe(payload.cards[0]?.tokenAnnotations?.Front);
    expect(cards[0]?.sourceCardIds).not.toBe(payload.cards[0]?.sourceCardIds);
  });

  it("converts only selected cards for confirming a generated set", () => {
    const cards = toggleDraftCardSelection(generatedCardsFromPayload(payload), 1);

    expect(selectedCardsForConfirm(cards)).toEqual([
      {
        fields: { Front: "hola", Back: "hello" },
        tokenAnnotations: {
          Front: [{ start: 0, end: 4, gloss: "hello" }],
        },
        sourceCardIds: [sourceCardId],
        rationale: "Common greeting",
      },
    ]);
  });

  it("omits source card ids when converting cards for append", () => {
    const cards = generatedCardsFromPayload(payload);

    expect(selectedCardsForAppend(cards)).toEqual([
      {
        fields: { Front: "hola", Back: "hello" },
        tokenAnnotations: {
          Front: [{ start: 0, end: 4, gloss: "hello" }],
        },
        rationale: "Common greeting",
      },
      {
        fields: { Front: "adios", Back: "goodbye" },
        rationale: "Common farewell",
      },
    ]);
  });

  it("edits one field without mutating the original cards", () => {
    const cards = generatedCardsFromPayload(payload);
    const edited = editDraftCardField(cards, 0, "Back", "hi");

    expect(edited[0]?.fields).toEqual({ Front: "hola", Back: "hi" });
    expect(edited[0]?.tokenAnnotations).toEqual({
      Front: [{ start: 0, end: 4, gloss: "hello" }],
    });
    expect(cards[0]?.fields).toEqual({ Front: "hola", Back: "hello" });
    expect(edited[1]).toEqual(cards[1]);
  });

  it("drops annotations for an edited field", () => {
    const cards = generatedCardsFromPayload(payload);
    const edited = editDraftCardField(cards, 0, "Front", "ola");

    expect(edited[0]?.tokenAnnotations).toBeUndefined();
  });

  it("returns copied selected fields for wizard state", () => {
    const cards = generatedCardsFromPayload(payload);
    const fields = includedCardFields(cards);

    expect(fields).toEqual([
      { Front: "hola", Back: "hello" },
      { Front: "adios", Back: "goodbye" },
    ]);
    expect(fields[0]).not.toBe(cards[0]?.fields);
  });
});
