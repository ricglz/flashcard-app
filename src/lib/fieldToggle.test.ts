import { describe, it, expect } from "vitest";
import type { FieldAssignments } from "./fieldToggle";
import { cycleFieldAssignment } from "./fieldToggle";

function makeAssignments(
  front: string[],
  back: string[],
  ttsOnly: string[] = []
): FieldAssignments {
  return { frontFields: front, backFields: back, ttsOnlyFields: ttsOnly };
}

describe("cycleFieldAssignment", () => {
  it("cycles front → back for non-TTS field", () => {
    const result = cycleFieldAssignment(
      "Meaning",
      makeAssignments(["Pinyin", "Meaning"], ["Character"]),
      false
    );
    expect(result.frontFields).toEqual(["Pinyin"]);
    expect(result.backFields).toEqual(["Character", "Meaning"]);
  });

  it("cycles back → front for non-TTS field", () => {
    const result = cycleFieldAssignment(
      "Character",
      makeAssignments(["Pinyin"], ["Character", "Meaning"]),
      false
    );
    expect(result.frontFields).toEqual(["Pinyin", "Character"]);
    expect(result.backFields).toEqual(["Meaning"]);
  });

  it("cycles front → back → ttsOnly → front for TTS-capable field", () => {
    let state = makeAssignments(["Character", "Pinyin"], ["Meaning"]);

    state = cycleFieldAssignment("Character", state, true);
    expect(state.frontFields).toEqual(["Pinyin"]);
    expect(state.backFields).toEqual(["Meaning", "Character"]);
    expect(state.ttsOnlyFields).toEqual([]);

    state = cycleFieldAssignment("Character", state, true);
    expect(state.frontFields).toEqual(["Pinyin"]);
    expect(state.backFields).toEqual(["Meaning"]);
    expect(state.ttsOnlyFields).toEqual(["Character"]);

    state = cycleFieldAssignment("Character", state, true);
    expect(state.frontFields).toEqual(["Pinyin", "Character"]);
    expect(state.backFields).toEqual(["Meaning"]);
    expect(state.ttsOnlyFields).toEqual([]);
  });

  it("does not move last front field out", () => {
    const state = makeAssignments(["Pinyin"], ["Meaning"]);
    const result = cycleFieldAssignment("Pinyin", state, false);
    expect(result).toEqual(state);
  });

  it("does not move last back field out (non-TTS)", () => {
    const state = makeAssignments(["Pinyin"], ["Meaning"]);
    const result = cycleFieldAssignment("Meaning", state, false);
    expect(result).toEqual(state);
  });

  it("does not move last back field to ttsOnly (TTS-capable)", () => {
    const state = makeAssignments(["Pinyin"], ["Character"]);
    const result = cycleFieldAssignment("Character", state, true);
    expect(result).toEqual(state);
  });

  it("returns unchanged if field not found in any list", () => {
    const state = makeAssignments(["Pinyin"], ["Meaning"]);
    const result = cycleFieldAssignment("Unknown", state, false);
    expect(result).toEqual(state);
  });
});
