import { FieldDefinition } from "./types";

/**
 * Language-specific field definition presets.
 * Used when creating a new flashcard set — user picks a language,
 * gets sensible defaults they can customize.
 */

export type LanguagePreset = {
  label: string;
  language: string;
  fieldDefinitions: FieldDefinition[];
};

export const LANGUAGE_PRESETS: Record<string, LanguagePreset> = {
  chinese: {
    label: "Chinese (Mandarin)",
    language: "zh-CN",
    fieldDefinitions: [
      {
        name: "Character",
        role: "primary",
        metadata: {},
        order: 0,
      },
      {
        name: "Pinyin",
        role: "pronunciation",
        metadata: { tts: { lang: "zh-CN" } },
        order: 1,
      },
      {
        name: "Meaning",
        role: "definition",
        metadata: {},
        order: 2,
      },
    ],
  },
  spanish: {
    label: "Spanish",
    language: "es",
    fieldDefinitions: [
      {
        name: "Spanish",
        role: "primary",
        metadata: { tts: { lang: "es" } },
        order: 0,
      },
      {
        name: "English",
        role: "definition",
        metadata: {},
        order: 1,
      },
    ],
  },
  japanese: {
    label: "Japanese",
    language: "ja",
    fieldDefinitions: [
      {
        name: "Kanji",
        role: "primary",
        metadata: {},
        order: 0,
      },
      {
        name: "Reading",
        role: "pronunciation",
        metadata: { tts: { lang: "ja" } },
        order: 1,
      },
      {
        name: "Meaning",
        role: "definition",
        metadata: {},
        order: 2,
      },
    ],
  },
  custom: {
    label: "Custom",
    language: "en",
    fieldDefinitions: [
      {
        name: "Front",
        role: "primary",
        metadata: {},
        order: 0,
      },
      {
        name: "Back",
        role: "definition",
        metadata: {},
        order: 1,
      },
    ],
  },
};

export const PRESET_KEYS = Object.keys(LANGUAGE_PRESETS);
