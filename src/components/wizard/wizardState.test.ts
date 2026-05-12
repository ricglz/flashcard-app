import { describe, it, expect } from "vitest";
import {
  wizardReducer,
  canProceed,
  initialState,
  WizardState,
} from "./wizardState";
import { FieldDefinition } from "@/lib/types";

const sampleField: FieldDefinition = {
  name: "Character",
  role: "primary",
  metadata: {},
  order: 0,
};

const sampleCard = { Character: "你" };

function stateWith(overrides: Partial<WizardState>): WizardState {
  return { ...initialState, ...overrides };
}

describe("wizardReducer", () => {
  it("sets name", () => {
    const result = wizardReducer(initialState, {
      type: "SET_NAME",
      payload: "My Set",
    });
    expect(result.name).toBe("My Set");
  });

  it("sets description", () => {
    const result = wizardReducer(initialState, {
      type: "SET_DESCRIPTION",
      payload: "A description",
    });
    expect(result.description).toBe("A description");
  });

  it("sets source method", () => {
    const result = wizardReducer(initialState, {
      type: "SET_SOURCE_METHOD",
      payload: "csv",
    });
    expect(result.sourceMethod).toBe("csv");
  });

  it("sets field definitions", () => {
    const result = wizardReducer(initialState, {
      type: "SET_FIELD_DEFINITIONS",
      payload: [sampleField],
    });
    expect(result.fieldDefinitions).toEqual([sampleField]);
  });

  it("sets cards", () => {
    const result = wizardReducer(initialState, {
      type: "SET_CARDS",
      payload: [sampleCard],
    });
    expect(result.cards).toEqual([sampleCard]);
  });

  it("adds a card", () => {
    const state = stateWith({ cards: [sampleCard] });
    const result = wizardReducer(state, {
      type: "ADD_CARD",
      payload: { Character: "好" },
    });
    expect(result.cards).toHaveLength(2);
    expect(result.cards[1]).toEqual({ Character: "好" });
  });

  it("removes a card by index", () => {
    const state = stateWith({
      cards: [{ a: "1" }, { a: "2" }, { a: "3" }],
    });
    const result = wizardReducer(state, {
      type: "REMOVE_CARD",
      payload: 1,
    });
    expect(result.cards).toEqual([{ a: "1" }, { a: "3" }]);
  });

  it("does not advance with NEXT_STEP when current step is invalid", () => {
    const result = wizardReducer(initialState, { type: "NEXT_STEP" });
    expect(result.step).toBe(1);
  });

  it("does not advance past step 4", () => {
    const state = stateWith({ step: 4 });
    const result = wizardReducer(state, { type: "NEXT_STEP" });
    expect(result.step).toBe(4);
    expect(result).toBe(state); // same reference — no mutation
  });

  it("goes back with PREV_STEP", () => {
    const state = stateWith({ step: 3 });
    const result = wizardReducer(state, { type: "PREV_STEP" });
    expect(result.step).toBe(2);
  });

  it("does not go below step 1", () => {
    const result = wizardReducer(initialState, { type: "PREV_STEP" });
    expect(result.step).toBe(1);
    expect(result).toBe(initialState); // same reference
  });
});

describe("canProceed", () => {
  it("step 1: requires name and source method", () => {
    expect(canProceed(initialState)).toBe(false);
    expect(canProceed(stateWith({ name: "Test" }))).toBe(false);
    expect(
      canProceed(stateWith({ name: "Test", sourceMethod: "csv" }))
    ).toBe(true);
  });

  it("step 1: rejects whitespace-only name", () => {
    expect(
      canProceed(stateWith({ name: "  ", sourceMethod: "csv" }))
    ).toBe(false);
  });

  it("step 2: requires cards and field definitions", () => {
    const base = stateWith({ step: 2 });
    expect(canProceed(base)).toBe(false);
    expect(canProceed(stateWith({ step: 2, cards: [sampleCard] }))).toBe(
      false
    );
    expect(
      canProceed(
        stateWith({
          step: 2,
          cards: [sampleCard],
          fieldDefinitions: [sampleField],
        })
      )
    ).toBe(true);
  });

  it("step 3: requires field definitions", () => {
    expect(canProceed(stateWith({ step: 3 }))).toBe(false);
    expect(
      canProceed(
        stateWith({ step: 3, fieldDefinitions: [sampleField], cards: [sampleCard] })
      )
    ).toBe(true);
  });

  it("step 4: always true", () => {
    expect(canProceed(stateWith({ step: 4, fieldDefinitions: [sampleField], cards: [sampleCard] }))).toBe(true);
  });
});
