import { describe, it, expect } from "vitest";
import { parseCsv } from "./csvParser";

describe("parseCsv", () => {
  it("parses valid CSV with headers and rows", () => {
    const csv = "Character,Pinyin,Meaning\n你,nǐ,you\n好,hǎo,good";
    const result = parseCsv(csv);

    expect(result.fieldDefinitions).toHaveLength(3);
    expect(result.cards).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    expect(result.cards[0]).toEqual({
      Character: "你",
      Pinyin: "nǐ",
      Meaning: "you",
    });
  });

  it("returns error for empty CSV", () => {
    const result = parseCsv("");
    expect(result.fieldDefinitions).toHaveLength(0);
    expect(result.cards).toHaveLength(0);
    expect(result.errors).toContainEqual({ _tag: "MissingHeaders", message: "No columns found" });
  });

  it("returns empty cards for headers-only CSV", () => {
    const result = parseCsv("Character,Pinyin,Meaning\n");
    expect(result.fieldDefinitions).toHaveLength(3);
    expect(result.cards).toHaveLength(0);
  });

  it("filters out rows with all-whitespace values", () => {
    const csv = "Character,Meaning\n你,you\n ,  \n好,good";
    const result = parseCsv(csv);
    expect(result.cards).toHaveLength(2);
  });

  it("trims whitespace from headers", () => {
    const csv = " Character , Meaning \nA,B";
    const result = parseCsv(csv);
    expect(result.fieldDefinitions[0]!.name).toBe("Character");
    expect(result.fieldDefinitions[1]!.name).toBe("Meaning");
  });
});

describe("role inference via parseCsv", () => {
  it("infers pronunciation role for Pinyin column", () => {
    const result = parseCsv("Pinyin\ntest");
    expect(result.fieldDefinitions[0]!.role).toBe("pronunciation");
  });

  it("infers pronunciation for Reading column", () => {
    const result = parseCsv("Reading\ntest");
    expect(result.fieldDefinitions[0]!.role).toBe("pronunciation");
  });

  it("infers definition role for Meaning column", () => {
    const result = parseCsv("Meaning\ntest");
    expect(result.fieldDefinitions[0]!.role).toBe("definition");
  });

  it("infers definition for English column", () => {
    const result = parseCsv("English\ntest");
    expect(result.fieldDefinitions[0]!.role).toBe("definition");
  });

  it("infers note role for Note column", () => {
    const result = parseCsv("Note\ntest");
    expect(result.fieldDefinitions[0]!.role).toBe("note");
  });

  it("defaults to primary for unknown column names", () => {
    const result = parseCsv("Character\ntest");
    expect(result.fieldDefinitions[0]!.role).toBe("primary");
  });
});

describe("metadata inference via parseCsv", () => {
  it("sets zh-CN TTS for Character column", () => {
    const result = parseCsv("Character\ntest");
    expect(result.fieldDefinitions[0]!.metadata).toEqual({
      tts: { lang: "zh-CN" },
    });
  });

  it("sets no TTS for Pinyin column (romanization, not native script)", () => {
    const result = parseCsv("Pinyin\ntest");
    expect(result.fieldDefinitions[0]!.metadata).toEqual({});
  });

  it("sets es TTS for Spanish column", () => {
    const result = parseCsv("Spanish\ntest");
    expect(result.fieldDefinitions[0]!.metadata).toEqual({
      tts: { lang: "es" },
    });
  });

  it("sets ja TTS for Kanji column", () => {
    const result = parseCsv("Kanji\ntest");
    expect(result.fieldDefinitions[0]!.metadata).toEqual({
      tts: { lang: "ja" },
    });
  });

  it("sets no TTS for unrecognized columns", () => {
    const result = parseCsv("Meaning\ntest");
    expect(result.fieldDefinitions[0]!.metadata).toEqual({});
  });
});

describe("field order via parseCsv", () => {
  it("assigns sequential order based on column position", () => {
    const result = parseCsv("A,B,C\n1,2,3");
    expect(result.fieldDefinitions.map((fd) => fd.order)).toEqual([
      0, 1, 2,
    ]);
  });
});
