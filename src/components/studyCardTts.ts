import type { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";

export type RevealTtsItem = {
  text: string;
  lang: string;
};

export function getTtsItems({
  cardFields,
  fieldDefinitions,
  fieldNames,
}: {
  cardFields: Record<string, string>;
  fieldDefinitions: readonly FieldDefinition[];
  fieldNames: readonly string[];
}): RevealTtsItem[] {
  const fieldDefsMap = new Map(fieldDefinitions.map((field) => [field.name, field]));
  const items: RevealTtsItem[] = [];

  for (const fieldName of fieldNames) {
    const fieldDefinition = fieldDefsMap.get(fieldName);
    const value = cardFields[fieldName];
    const ttsConfig = fieldDefinition ? getTtsConfig(fieldDefinition) : null;

    if (ttsConfig && value) {
      items.push({ text: value, lang: ttsConfig.lang });
    }
  }

  return items;
}

export function getRevealTtsItems({
  cardFields,
  fieldDefinitions,
  backFields,
  ttsOnlyFields,
}: {
  cardFields: Record<string, string>;
  fieldDefinitions: readonly FieldDefinition[];
  backFields: readonly string[];
  ttsOnlyFields: readonly string[];
}): RevealTtsItem[] {
  return getTtsItems({
    cardFields,
    fieldDefinitions,
    fieldNames: [...backFields, ...ttsOnlyFields],
  });
}
