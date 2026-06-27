import type { FieldDefinition } from "@/lib/types";
import type { TokenAnnotations } from "@/lib/types";

export function normalizeFieldOrder(fields: readonly FieldDefinition[]): FieldDefinition[] {
  return fields.map((field, index) => ({ ...field, order: index }));
}

export function addFieldDefinition(
  fields: readonly FieldDefinition[],
  rawName: string,
): FieldDefinition[] {
  const name = rawName.trim();
  if (!name || fields.some((field) => field.name === name)) return [...fields];
  return [
    ...fields,
    {
      name,
      role: "primary",
      metadata: {},
      order: fields.length,
    },
  ];
}

export function updateFieldDefinition(
  fields: readonly FieldDefinition[],
  index: number,
  updates: Partial<FieldDefinition>,
): FieldDefinition[] {
  return fields.map((field, fieldIndex) =>
    fieldIndex === index ? { ...field, ...updates } : field,
  );
}

export function removeFieldDefinition(
  fields: readonly FieldDefinition[],
  index: number,
): FieldDefinition[] {
  return normalizeFieldOrder(fields.filter((_, fieldIndex) => fieldIndex !== index));
}

export function toggleFieldDefinitionTts(
  fields: readonly FieldDefinition[],
  index: number,
  defaultLang = "en",
): FieldDefinition[] {
  const field = fields[index];
  if (!field) return [...fields];
  const { tts, ...restMetadata } = field.metadata;
  return updateFieldDefinition(fields, index, {
    metadata: tts
      ? restMetadata
      : { ...field.metadata, tts: { lang: field.metadata.tts?.lang ?? defaultLang } },
  });
}

export type DraftCardWithAnnotations = {
  fields: Record<string, string>;
  tokenAnnotations?: TokenAnnotations;
};

export function removeFieldValueFromCards<Card extends DraftCardWithAnnotations>(
  cards: readonly Card[],
  fieldName: string,
): Card[] {
  return cards.map((card) => {
    const fields = Object.fromEntries(
      Object.entries(card.fields).filter(([key]) => key !== fieldName),
    );
    const tokenAnnotations = { ...(card.tokenAnnotations ?? {}) };
    delete tokenAnnotations[fieldName];
    return {
      ...card,
      fields,
      tokenAnnotations: Object.keys(tokenAnnotations).length > 0 ? tokenAnnotations : undefined,
    };
  });
}
