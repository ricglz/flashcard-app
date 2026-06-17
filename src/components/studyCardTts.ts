import type { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";

export type RevealTtsItem = {
  text: string;
  lang: string;
  itemId: string;
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
      items.push({ text: value, lang: ttsConfig.lang, itemId: fieldName });
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

function getFieldDefsKey(fieldDefinitions: readonly FieldDefinition[]): string {
  return JSON.stringify(
    fieldDefinitions.map((fd) => ({ name: fd.name, lang: fd.metadata.tts?.lang ?? null })),
  );
}

function getItemsKey(items: readonly RevealTtsItem[]): string {
  return JSON.stringify(items.map((it) => ({ itemId: it.itemId, lang: it.lang, text: it.text })));
}

export type TtsPlan = {
  frontItems: RevealTtsItem[];
  revealItems: RevealTtsItem[];
  frontKey: string;
  revealKey: string;
};

export function getTtsPlan({
  cardFields,
  fieldDefinitions,
  frontFields,
  backFields,
  ttsOnlyFields = [],
}: {
  cardFields: Record<string, string>;
  fieldDefinitions: readonly FieldDefinition[];
  frontFields: readonly string[];
  backFields: readonly string[];
  ttsOnlyFields?: readonly string[];
}): TtsPlan {
  const frontItems = getTtsItems({ cardFields, fieldDefinitions, fieldNames: frontFields });
  const revealItems = getRevealTtsItems({ cardFields, fieldDefinitions, backFields, ttsOnlyFields });
  const defsKey = getFieldDefsKey(fieldDefinitions);
  const frontKey = JSON.stringify({ fieldNames: frontFields, defs: defsKey, items: getItemsKey(frontItems) });
  const revealKey = JSON.stringify({ fieldNames: [...backFields, ...ttsOnlyFields], defs: defsKey, items: getItemsKey(revealItems) });
  return { frontItems, revealItems, frontKey, revealKey };
}
