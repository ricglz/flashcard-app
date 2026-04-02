import Papa from "papaparse";
import { FieldDefinition } from "./types";

export type ParsedCsvResult = {
  fieldDefinitions: FieldDefinition[];
  cards: Array<Record<string, string>>;
  errors: string[];
};

/**
 * Parse a CSV file/string into flashcard data.
 * - Headers become field definition names
 * - Each row becomes a card with fields keyed by header names
 * - Infers basic field roles from common column names
 */
export function parseCsv(csvText: string): ParsedCsvResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors: string[] = result.errors.map(
    (e) => `Row ${e.row ?? "?"}: ${e.message}`
  );

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    return { fieldDefinitions: [], cards: [], errors: ["No columns found"] };
  }

  const fieldDefinitions: FieldDefinition[] = headers.map(
    (name, index) => ({
      name,
      role: inferRole(name),
      metadata: inferMetadata(name),
      order: index,
    })
  );

  const cards = result.data.filter((row) =>
    Object.values(row).some((v) => v.trim() !== "")
  );

  return { fieldDefinitions, cards, errors };
}

/** Best-effort role inference from common column names. */
function inferRole(
  name: string
): FieldDefinition["role"] {
  const lower = name.toLowerCase();
  if (
    ["pinyin", "reading", "pronunciation", "phonetic", "romaji", "ipa"].some(
      (k) => lower.includes(k)
    )
  )
    return "pronunciation";
  if (
    [
      "meaning",
      "definition",
      "translation",
      "english",
      "answer",
      "back",
    ].some((k) => lower.includes(k))
  )
    return "definition";
  if (
    ["note", "hint", "example", "context"].some((k) => lower.includes(k))
  )
    return "note";
  return "primary";
}

/** Infer metadata (e.g., TTS) from column name patterns. */
function inferMetadata(name: string): FieldDefinition["metadata"] {
  const lower = name.toLowerCase();
  if (lower.includes("pinyin") || lower.includes("chinese"))
    return { tts: { lang: "zh-CN" } };
  if (lower.includes("spanish") || lower.includes("español"))
    return { tts: { lang: "es" } };
  if (lower.includes("japanese") || lower.includes("romaji"))
    return { tts: { lang: "ja" } };
  if (lower.includes("pronunciation") || lower.includes("phonetic"))
    return { tts: { lang: "en" } };
  return {};
}
