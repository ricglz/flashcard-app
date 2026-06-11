import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import { getRevealTtsItems } from "./studyCardTts";

const fieldDefinitions: FieldDefinition[] = [
  { name: "Front", role: "primary", metadata: {}, order: 0 },
  { name: "Back", role: "definition", metadata: { tts: { lang: "ja-JP" } }, order: 1 },
  {
    name: "Pronunciation",
    role: "pronunciation",
    metadata: { tts: { lang: "ja-JP" } },
    order: 2,
  },
  { name: "Notes", role: "note", metadata: {}, order: 3 },
];

describe("getRevealTtsItems", () => {
  it("returns TTS-enabled back and TTS-only fields in playback order", () => {
    expect(
      getRevealTtsItems({
        cardFields: {
          Front: "question",
          Back: "answer",
          Pronunciation: "pronunciation",
          Notes: "not spoken",
        },
        fieldDefinitions,
        backFields: ["Back", "Notes"],
        ttsOnlyFields: ["Pronunciation"],
      }),
    ).toEqual([
      { text: "answer", lang: "ja-JP" },
      { text: "pronunciation", lang: "ja-JP" },
    ]);
  });

  it("skips missing or empty field values", () => {
    expect(
      getRevealTtsItems({
        cardFields: { Back: "", Pronunciation: "pronunciation" },
        fieldDefinitions,
        backFields: ["Back", "Missing"],
        ttsOnlyFields: ["Pronunciation"],
      }),
    ).toEqual([{ text: "pronunciation", lang: "ja-JP" }]);
  });
});
