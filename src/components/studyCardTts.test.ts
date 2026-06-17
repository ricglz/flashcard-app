import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import { getRevealTtsItems, getTtsPlan } from "./studyCardTts";

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
      { text: "answer", lang: "ja-JP", itemId: "Back" },
      { text: "pronunciation", lang: "ja-JP", itemId: "Pronunciation" },
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
    ).toEqual([{ text: "pronunciation", lang: "ja-JP", itemId: "Pronunciation" }]);
  });
});

describe("getTtsPlan", () => {
  it("returns stable keys for front and reveal items", () => {
    const plan1 = getTtsPlan({
      cardFields: { Front: "q", Back: "a", Pronunciation: "p" },
      fieldDefinitions,
      frontFields: ["Front"],
      backFields: ["Back"],
      ttsOnlyFields: ["Pronunciation"],
    });
    const plan2 = getTtsPlan({
      cardFields: { Front: "q", Back: "a", Pronunciation: "p" },
      fieldDefinitions: [...fieldDefinitions],
      frontFields: ["Front"],
      backFields: ["Back"],
      ttsOnlyFields: ["Pronunciation"],
    });
    expect(plan1.frontKey).toBe(plan2.frontKey);
    expect(plan1.revealKey).toBe(plan2.revealKey);
    expect(plan1.frontItems).toEqual([]);
    expect(plan1.revealItems).toEqual([
      { text: "a", lang: "ja-JP", itemId: "Back" },
      { text: "p", lang: "ja-JP", itemId: "Pronunciation" },
    ]);
  });

  it("changes key when content changes", () => {
    const base = {
      cardFields: { Front: "q", Back: "a" },
      fieldDefinitions,
      frontFields: ["Front"],
      backFields: ["Back"],
      ttsOnlyFields: [],
    };
    const plan1 = getTtsPlan(base);
    const plan2 = getTtsPlan({ ...base, cardFields: { Front: "q", Back: "b" } });
    expect(plan1.revealKey).not.toBe(plan2.revealKey);
  });
});
