import type { FieldDefinition } from "./types";

export type LanguagePreset = {
  label: string;
  fieldDefinitions: FieldDefinition[];
};

export const LANGUAGE_PRESETS = {
  chinese: {
    label: "Chinese (Mandarin)",
    fieldDefinitions: [
      {
        name: "Character",
        role: "primary",
        metadata: { tts: { lang: "zh-CN" } },
        order: 0,
      },
      {
        name: "Pinyin",
        role: "pronunciation",
        metadata: {},
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
    fieldDefinitions: [
      {
        name: "Kanji",
        role: "primary",
        metadata: { tts: { lang: "ja" } },
        order: 0,
      },
      {
        name: "Reading",
        role: "pronunciation",
        metadata: {},
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
} satisfies Record<string, LanguagePreset>;

export type PresetKey = keyof typeof LANGUAGE_PRESETS;
export const PRESET_KEYS = Object.keys(LANGUAGE_PRESETS) as PresetKey[];
