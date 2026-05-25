import { describe, expect, it } from "vitest";
import {
  indexAfterHidingCurrent,
  nextCardIndex,
  previousCardIndex,
  resolveNavigationState,
  safeCardIndex,
  visibleCardIds,
} from "./useCardNavigation";

describe("card navigation helpers", () => {
  it("filters hidden card ids without reordering", () => {
    expect(visibleCardIds(["a", "b", "c"], new Set(["b"]))).toEqual(["a", "c"]);
  });

  it("clamps indexes to the visible card range", () => {
    expect(safeCardIndex(-1, 3)).toBe(0);
    expect(safeCardIndex(2, 3)).toBe(2);
    expect(safeCardIndex(5, 3)).toBe(2);
    expect(safeCardIndex(5, 0)).toBe(0);
  });

  it("advances within the range by default", () => {
    expect(nextCardIndex(0, 3)).toBe(1);
    expect(nextCardIndex(2, 3)).toBe(2);
  });

  it("can advance one past the end for completion flows", () => {
    expect(nextCardIndex(2, 3, true)).toBe(3);
    expect(nextCardIndex(3, 3, true)).toBe(3);
  });

  it("moves backward without going negative", () => {
    expect(previousCardIndex(2)).toBe(1);
    expect(previousCardIndex(0)).toBe(0);
  });

  it("keeps the same visible position after hiding unless the last card was hidden", () => {
    expect(indexAfterHidingCurrent(0, 3)).toBe(0);
    expect(indexAfterHidingCurrent(2, 3)).toBe(1);
    expect(indexAfterHidingCurrent(0, 1)).toBe(0);
  });

  it("reconciles local index with a newer server index", () => {
    const state = resolveNavigationState({
      orderedIds: ["a", "b", "c"],
      hiddenIds: new Set(),
      currentIndex: 0,
      serverIndex: 2,
      reconcileServerIndex: true,
    });

    expect(state.currentIndex).toBe(2);
    expect(state.currentId).toBe("c");
  });

  it("keeps hidden cards out of resolved navigation state", () => {
    const state = resolveNavigationState({
      orderedIds: ["a", "b", "c"],
      hiddenIds: new Set(["b"]),
      currentIndex: 1,
    });

    expect(state.activeIds).toEqual(["a", "c"]);
    expect(state.currentId).toBe("c");
  });
});
