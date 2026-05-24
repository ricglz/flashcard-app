import { describe, it, expect } from "vitest";
import { isPresetKey, LANGUAGE_PRESETS, PRESET_KEYS, type LanguagePreset } from "./presets";

describe("LANGUAGE_PRESETS", () => {
  it("PRESET_KEYS matches Object.keys", () => {
    expect(PRESET_KEYS).toEqual(Object.keys(LANGUAGE_PRESETS));
  });

  it("every preset has at least one field definition", () => {
    for (const [key, preset] of Object.entries<LanguagePreset>(LANGUAGE_PRESETS)) {
      expect(
        preset.fieldDefinitions.length,
        `${key} has no field definitions`
      ).toBeGreaterThan(0);
    }
  });

  it("every preset has sequential orders starting from 0", () => {
    for (const [key, preset] of Object.entries<LanguagePreset>(LANGUAGE_PRESETS)) {
      const orders = preset.fieldDefinitions.map((fd) => fd.order);
      const expected = Array.from({ length: orders.length }, (_, i) => i);
      expect(orders, `${key} has non-sequential orders`).toEqual(expected);
    }
  });

  it("non-custom presets have TTS on at least one field", () => {
    for (const [key, preset] of Object.entries<LanguagePreset>(LANGUAGE_PRESETS)) {
      if (key === "custom") continue;
      const hasTts = preset.fieldDefinitions.some(
        (fd) => fd.metadata.tts
      );
      expect(hasTts, `${key} has no TTS-enabled field`).toBe(true);
    }
  });

  it("every preset has a non-empty label", () => {
    for (const [key, preset] of Object.entries<LanguagePreset>(LANGUAGE_PRESETS)) {
      expect(
        preset.label.length,
        `${key} has empty label`
      ).toBeGreaterThan(0);
    }
  });

  it("recognizes only defined preset keys", () => {
    expect(isPresetKey("custom")).toBe(true);
    expect(isPresetKey("unknown")).toBe(false);
  });
});
