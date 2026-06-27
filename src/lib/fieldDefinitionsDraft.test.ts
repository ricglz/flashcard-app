import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import {
  addFieldDefinition,
  removeFieldDefinition,
  removeFieldValueFromCards,
  toggleFieldDefinitionTts,
  updateFieldDefinition,
} from "./fieldDefinitionsDraft";

const fields: FieldDefinition[] = [
  { name: "Front", role: "primary", metadata: {}, order: 0 },
  { name: "Back", role: "definition", metadata: {}, order: 1 },
];

describe("field definition draft helpers", () => {
  it("adds trimmed unique fields with the next order", () => {
    expect(addFieldDefinition(fields, " Example ")).toEqual([
      ...fields,
      { name: "Example", role: "primary", metadata: {}, order: 2 },
    ]);
  });

  it("ignores blank and duplicate field names", () => {
    expect(addFieldDefinition(fields, " ")).toEqual(fields);
    expect(addFieldDefinition(fields, "Front")).toEqual(fields);
  });

  it("updates a field by index", () => {
    expect(updateFieldDefinition(fields, 1, { role: "note" })[1]).toMatchObject({
      name: "Back",
      role: "note",
    });
  });

  it("removes a field and normalizes order", () => {
    expect(removeFieldDefinition(fields, 0)).toEqual([
      { name: "Back", role: "definition", metadata: {}, order: 0 },
    ]);
  });

  it("toggles TTS metadata", () => {
    const enabled = toggleFieldDefinitionTts(fields, 0, "zh-CN");
    expect(enabled[0]?.metadata).toEqual({ tts: { lang: "zh-CN" } });
    expect(toggleFieldDefinitionTts(enabled, 0)[0]?.metadata).toEqual({});
  });

  it("removes deleted field values from draft cards", () => {
    expect(
      removeFieldValueFromCards(
        [{
          fields: { Front: "Q", Back: "A" },
          tokenAnnotations: { Back: [{ start: 0, end: 1, gloss: "answer" }] },
        }],
        "Back",
      ),
    ).toEqual([
      { fields: { Front: "Q" }, tokenAnnotations: undefined },
    ]);
  });
});
