import { describe, expect, it } from "vitest";
import {
  getCardsForRefinement,
  getRefinementIndexes,
  getRefinementScopeCount,
  mergeRefinedCards,
} from "./refinementScope";

type TestCard = {
  id: string;
  front: string;
  selected: boolean;
};

const cards: TestCard[] = [
  { id: "a", front: "A", selected: true },
  { id: "b", front: "B", selected: false },
  { id: "c", front: "C", selected: true },
];

describe("refinement scope helpers", () => {
  it("selects every card for all scope", () => {
    expect(getRefinementIndexes(cards, "all")).toEqual([0, 1, 2]);
    expect(getRefinementScopeCount(cards, "all")).toBe(3);
    expect(getCardsForRefinement(cards, "all").map((card) => card.id)).toEqual(["a", "b", "c"]);
  });

  it("selects only included cards for included scope", () => {
    expect(getRefinementIndexes(cards, "included")).toEqual([0, 2]);
    expect(getRefinementScopeCount(cards, "included")).toBe(2);
    expect(getCardsForRefinement(cards, "included").map((card) => card.id)).toEqual(["a", "c"]);
  });

  it("selects only excluded cards for excluded scope", () => {
    expect(getRefinementIndexes(cards, "excluded")).toEqual([1]);
    expect(getRefinementScopeCount(cards, "excluded")).toBe(1);
    expect(getCardsForRefinement(cards, "excluded").map((card) => card.id)).toEqual(["b"]);
  });

  it("replaces only cards in the requested scope", () => {
    const result = mergeRefinedCards(cards, [
      { id: "new-a", front: "New A", selected: true },
      { id: "new-c", front: "New C", selected: true },
    ], "included");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cards).toEqual([
        { id: "new-a", front: "New A", selected: true },
        { id: "b", front: "B", selected: false },
        { id: "new-c", front: "New C", selected: true },
      ]);
    }
  });

  it("preserves original selected flags when merging refined cards", () => {
    const result = mergeRefinedCards(cards, [
      { id: "new-a", front: "New A", selected: false },
      { id: "new-b", front: "New B", selected: true },
      { id: "new-c", front: "New C", selected: false },
    ], "all");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cards.map((card) => card.selected)).toEqual([true, false, true]);
    }
  });

  it("returns an error without merging when counts do not match", () => {
    const result = mergeRefinedCards(cards, [
      { id: "new-a", front: "New A", selected: true },
    ], "included");

    expect(result).toEqual({
      ok: false,
      expectedCount: 2,
      actualCount: 1,
      scope: "included",
    });
  });
});
