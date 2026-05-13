import { describe, it, expect } from "vitest";
import {
  wizardReducer,
  canProceed,
  validateWizardStep,
  hasSourceMethod,
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

const secondField: FieldDefinition = {
  name: "Meaning",
  role: "definition",
  metadata: {},
  order: 1,
};

const duplicateOrderField: FieldDefinition = {
  name: "Meaning",
  role: "definition",
  metadata: {},
  order: 0,
};

const sampleCard = { Character: "你" };
const validStep2State = {
  step: 2 as const,
  name: "Test",
  sourceMethod: "manual" as const,
  fieldDefinitions: [sampleField],
  cards: [sampleCard],
};

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

  it("advances with NEXT_STEP when current step and prerequisites are valid", () => {
    const fromStep1 = stateWith({ name: "Test", sourceMethod: "manual" });
    expect(wizardReducer(fromStep1, { type: "NEXT_STEP" }).step).toBe(2);

    const fromStep2 = stateWith(validStep2State);
    expect(wizardReducer(fromStep2, { type: "NEXT_STEP" }).step).toBe(3);
  });

  it("blocks NEXT_STEP when an earlier prerequisite is invalid", () => {
    const state = stateWith({
      ...validStep2State,
      name: " ",
    });
    const result = wizardReducer(state, { type: "NEXT_STEP" });
    expect(result.step).toBe(2);
    expect(result).toBe(state);
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

  it("clears incompatible draft data and returns to step 1 when source method changes", () => {
    const state = stateWith({
      ...validStep2State,
      step: 3,
      description: "Keep this description",
    });
    const result = wizardReducer(state, {
      type: "SET_SOURCE_METHOD",
      payload: "csv",
    });

    expect(result).toMatchObject({
      step: 1,
      name: "Test",
      description: "Keep this description",
      sourceMethod: "csv",
      fieldDefinitions: [],
      cards: [],
    });
  });

  it("preserves draft data when re-selecting the same source method", () => {
    const state = stateWith(validStep2State);
    const result = wizardReducer(state, {
      type: "SET_SOURCE_METHOD",
      payload: "manual",
    });

    expect(result.step).toBe(2);
    expect(result.fieldDefinitions).toEqual([sampleField]);
    expect(result.cards).toEqual([sampleCard]);
  });

  it("normalizes to step 1 when name is invalidated from a later step", () => {
    const state = stateWith({ ...validStep2State, step: 4 });
    const result = wizardReducer(state, { type: "SET_NAME", payload: " " });

    expect(result.step).toBe(1);
    expect(result.name).toBe(" ");
  });

  it("normalizes to step 2 when removing the last card from a later step", () => {
    const state = stateWith({ ...validStep2State, step: 4 });
    const result = wizardReducer(state, { type: "REMOVE_CARD", payload: 0 });

    expect(result.step).toBe(2);
    expect(result.cards).toEqual([]);
  });

  it("normalizes to step 2 when field definitions are invalidated from a later step", () => {
    const state = stateWith({ ...validStep2State, step: 4 });
    const result = wizardReducer(state, {
      type: "SET_FIELD_DEFINITIONS",
      payload: [sampleField, duplicateOrderField],
    });

    expect(result.step).toBe(2);
    expect(result.fieldDefinitions).toEqual([sampleField, duplicateOrderField]);
  });

  it("does not normalize backward when changing valid draft data on the current step", () => {
    const state = stateWith({ ...validStep2State, step: 2 });
    const result = wizardReducer(state, {
      type: "SET_FIELD_DEFINITIONS",
      payload: [sampleField, secondField],
    });

    expect(result.step).toBe(2);
    expect(result.fieldDefinitions).toEqual([sampleField, secondField]);
  });

  it("resets to the initial wizard state", () => {
    const state = stateWith({
      step: 4,
      name: "Test",
      description: "Description",
      sourceMethod: "manual",
      fieldDefinitions: [sampleField],
      cards: [sampleCard],
    });

    expect(wizardReducer(state, { type: "RESET" })).toEqual(initialState);
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
    const base = stateWith({ step: 2, name: "Test", sourceMethod: "manual" });
    expect(canProceed(base)).toBe(false);
    expect(
      canProceed(stateWith({ ...base, cards: [sampleCard] }))
    ).toBe(false);
    expect(
      canProceed(
        stateWith({
          ...base,
          cards: [sampleCard],
          fieldDefinitions: [sampleField],
        })
      )
    ).toBe(true);
  });

  it("step 3: requires all previous data to remain valid", () => {
    expect(canProceed(stateWith({ step: 3 }))).toBe(false);
    expect(
      canProceed(
        stateWith({ ...validStep2State, step: 3 })
      )
    ).toBe(true);
    expect(
      canProceed(
        stateWith({ ...validStep2State, step: 3, name: " " })
      )
    ).toBe(false);
  });

  it("step 4: requires all previous data to remain valid", () => {
    expect(canProceed(stateWith({ ...validStep2State, step: 4 }))).toBe(true);
    expect(canProceed(stateWith({ step: 4 }))).toBe(false);
  });
});

describe("wizardReducer — source method from null", () => {
  it("sets source method from null without resetting data", () => {
    const state = stateWith({
      name: "Test",
      fieldDefinitions: [sampleField],
      cards: [sampleCard],
    });
    const result = wizardReducer(state, {
      type: "SET_SOURCE_METHOD",
      payload: "csv",
    });
    expect(result.sourceMethod).toBe("csv");
    expect(result.fieldDefinitions).toEqual([sampleField]);
    expect(result.cards).toEqual([sampleCard]);
  });
});

describe("wizardReducer — mismatched card fields", () => {
  it("normalizes step when cards have fields not matching field definitions", () => {
    const state = stateWith({
      ...validStep2State,
      step: 4,
    });
    const result = wizardReducer(state, {
      type: "SET_CARDS",
      payload: [{ UnknownField: "value" }],
    });
    expect(result.step).toBe(2);
    expect(result.cards).toEqual([{ UnknownField: "value" }]);
  });
});

describe("wizardReducer — sequential transitions", () => {
  it("handles advancing to step 3 then invalidating step 1 data", () => {
    let state = stateWith({ ...validStep2State, step: 2 });
    state = wizardReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe(3);

    state = wizardReducer(state, { type: "SET_NAME", payload: "" });
    expect(state.step).toBe(1);

    state = wizardReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe(1);
  });

  it("handles double NEXT_STEP in sequence", () => {
    const state = stateWith({
      ...validStep2State,
      step: 1,
      name: "Test",
      sourceMethod: "manual",
    });
    const afterFirst = wizardReducer(state, { type: "NEXT_STEP" });
    expect(afterFirst.step).toBe(2);

    const afterSecond = wizardReducer(afterFirst, { type: "NEXT_STEP" });
    expect(afterSecond.step).toBe(3);
  });
});

describe("validateWizardStep", () => {
  it("returns ok for valid step 1 data", () => {
    const state = stateWith({ name: "Test", sourceMethod: "manual" });
    const result = validateWizardStep(state, 1);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("returns issues for empty name at step 1", () => {
    const result = validateWizardStep(initialState, 1);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "name", step: 1 })
    );
  });

  it("returns issues for null sourceMethod at step 1", () => {
    const state = stateWith({ name: "Test" });
    const result = validateWizardStep(state, 1);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "sourceMethod", step: 1 })
    );
  });

  it("returns issues when validating step 2 with no cards or fields", () => {
    const state = stateWith({ step: 2, name: "Test", sourceMethod: "manual" });
    const result = validateWizardStep(state, 2);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });

  it("validates a specific step regardless of current step", () => {
    const state = stateWith({ name: "Test", sourceMethod: "manual" });
    const result = validateWizardStep(state, 2);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "cards" })
    );
  });
});

describe("hasSourceMethod", () => {
  it("returns false for initial state", () => {
    expect(hasSourceMethod(initialState)).toBe(false);
  });

  it("returns true when sourceMethod is set", () => {
    const state = stateWith({ sourceMethod: "csv" });
    expect(hasSourceMethod(state)).toBe(true);
  });

  it("narrows the type so sourceMethod is non-null", () => {
    const state = stateWith({ sourceMethod: "manual" });
    if (hasSourceMethod(state)) {
      const method: "csv" | "manual" = state.sourceMethod;
      expect(method).toBe("manual");
    }
  });
});
