import Papa from "papaparse";
import { FieldDefinition } from "./types";
import { validateCardFields } from "../../convex/domain/cardFields";
import { validateFieldDefinitions, normalizeFieldName } from "../../convex/domain/fieldDefinitions";

export type CsvBlockingError =
  | { _tag: "MissingHeaders"; message: string }
  | { _tag: "DuplicateHeaders"; message: string; header: string }
  | { _tag: "MalformedRow"; message: string; row: number }
  | { _tag: "NoUsefulRows"; message: string };

export type CsvWarning =
  | { _tag: "EmptyRow"; message: string; row: number }
  | { _tag: "ParserWarning"; message: string; row: number | null }
  | { _tag: "InvalidRow"; message: string; row: number };

export type ParsedCsvSuccess = {
  ok: true;
  fieldDefinitions: FieldDefinition[];
  cards: Array<Record<string, string>>;
  warnings: CsvWarning[];
  /** Compatibility alias while callers migrate to typed warnings. */
  errors: string[];
};

export type ParsedCsvFailure = {
  ok: false;
  fieldDefinitions: FieldDefinition[];
  cards: [];
  errors: CsvBlockingError[];
  warnings: CsvWarning[];
};

export type ParsedCsvResult = ParsedCsvSuccess | ParsedCsvFailure;

/**
 * Parse a CSV file/string into flashcard data.
 * - Headers become field definition names
 * - Each row becomes a card with fields keyed by header names
 * - Infers basic field roles from common column names
 */
export function parseCsv(csvText: string): ParsedCsvResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (h) => h.trim(),
  });

  const meaningfulParserErrors = result.errors.filter((e) => e.code !== "UndetectableDelimiter");
  const warnings: CsvWarning[] = meaningfulParserErrors.map((e) => ({
    _tag: "ParserWarning" as const,
    row: e.row ?? null,
    message: `Row ${e.row ?? "?"}: ${e.message}`,
  }));
  const malformed = meaningfulParserErrors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (malformed) {
    return {
      ok: false,
      fieldDefinitions: [],
      cards: [],
      warnings,
      errors: [{ _tag: "MalformedRow", row: malformed.row ?? 0, message: `Row ${malformed.row ?? "?"}: ${malformed.message}` }],
    };
  }

  const headers = (result.meta.fields ?? []).filter((header) => header.trim().length > 0);
  if (headers.length === 0) {
    return {
      ok: false,
      fieldDefinitions: [],
      cards: [],
      warnings,
      errors: [{ _tag: "MissingHeaders", message: "No columns found" }],
    };
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    const normalized = normalizeFieldName(header);
    if (seenHeaders.has(normalized)) {
      return {
        ok: false,
        fieldDefinitions: [],
        cards: [],
        warnings,
        errors: [{ _tag: "DuplicateHeaders", header, message: `Duplicate header: ${header}` }],
      };
    }
    seenHeaders.add(normalized);
  }

  const fieldDefinitions: FieldDefinition[] = headers.map((name, index) => ({
    name,
    role: inferRole(name),
    metadata: inferMetadata(name),
    order: index,
  }));
  const fieldValidation = validateFieldDefinitions(fieldDefinitions);
  if (!fieldValidation.ok) {
    return {
      ok: false,
      fieldDefinitions: [],
      cards: [],
      warnings,
      errors: [{ _tag: "MissingHeaders", message: fieldValidation.error.message }],
    };
  }

  const cards: Array<Record<string, string>> = [];
  for (let index = 0; index < result.data.length; index++) {
    const row = result.data[index];
    const rowNumber = index + 2;
    const hasAnyValue = Object.values(row ?? {}).some((v) => v.trim() !== "");
    if (!hasAnyValue) {
      warnings.push({ _tag: "EmptyRow", row: rowNumber, message: `Row ${rowNumber}: empty row skipped` });
      continue;
    }
    const validation = validateCardFields(headers, row ?? {});
    if (!validation.ok) {
      warnings.push({ _tag: "InvalidRow", row: rowNumber, message: `Row ${rowNumber}: ${validation.error.message}` });
      continue;
    }
    cards.push(validation.value);
  }

  if (cards.length === 0) {
    return {
      ok: false,
      fieldDefinitions: fieldValidation.value ?? fieldDefinitions,
      cards: [],
      warnings,
      errors: [{ _tag: "NoUsefulRows", message: "No valid rows found in the CSV." }],
    };
  }

  return {
    ok: true,
    fieldDefinitions: fieldValidation.value ?? fieldDefinitions,
    cards,
    warnings,
    errors: warnings.map((warning) => warning.message),
  };
}

function inferRole(name: string): FieldDefinition["role"] {
  const lower = name.toLowerCase();
  if (["pinyin", "reading", "pronunciation", "phonetic", "romaji", "ipa"].some((k) => lower.includes(k))) {
    return "pronunciation";
  }
  if (["meaning", "definition", "translation", "english", "answer", "back"].some((k) => lower.includes(k))) {
    return "definition";
  }
  if (["note", "hint", "example", "context"].some((k) => lower.includes(k))) return "note";
  return "primary";
}

function inferMetadata(name: string): FieldDefinition["metadata"] {
  const lower = name.toLowerCase();
  if (lower.includes("character") || lower.includes("hanzi") || lower.includes("chinese")) return { tts: { lang: "zh-CN" } };
  if (lower.includes("kanji") || lower.includes("japanese")) return { tts: { lang: "ja" } };
  if (lower.includes("spanish") || lower.includes("español")) return { tts: { lang: "es" } };
  return {};
}
