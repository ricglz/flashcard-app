import type { GeneratedSetPayload } from "./aiToolingSchemas";
import type { DraftCard } from "./generatedSetDraft";

export type GeneratedDraftCard = GeneratedSetPayload["cards"][number] & {
  selected: boolean;
};

export function generatedCardsFromPayload(
  payload: GeneratedSetPayload,
): GeneratedDraftCard[] {
  return payload.cards.map((card) => ({
    fields: { ...card.fields },
    sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
    rationale: card.rationale,
    selected: true,
  }));
}

export function selectedCardsForConfirm(
  cards: readonly GeneratedDraftCard[],
): DraftCard[] {
  return cards
    .filter((card) => card.selected)
    .map((card) => ({
      fields: { ...card.fields },
      sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
      rationale: card.rationale,
    }));
}

export function selectedCardsForAppend(
  cards: readonly GeneratedDraftCard[],
): Pick<DraftCard, "fields" | "rationale">[] {
  return cards
    .filter((card) => card.selected)
    .map((card) => ({
      fields: { ...card.fields },
      rationale: card.rationale,
    }));
}

export function includedCardFields(
  cards: readonly GeneratedDraftCard[],
): Record<string, string>[] {
  return cards
    .filter((card) => card.selected)
    .map((card) => ({ ...card.fields }));
}

export function toggleDraftCardSelection(
  cards: readonly GeneratedDraftCard[],
  index: number,
): GeneratedDraftCard[] {
  const card = cards[index];
  if (!card) return [...cards];
  const nextCards = [...cards];
  nextCards[index] = { ...card, selected: !card.selected };
  return nextCards;
}

export function editDraftCardField(
  cards: readonly GeneratedDraftCard[],
  index: number,
  key: string,
  value: string,
): GeneratedDraftCard[] {
  const card = cards[index];
  if (!card) return [...cards];
  const nextCards = [...cards];
  nextCards[index] = {
    ...card,
    fields: { ...card.fields, [key]: value },
  };
  return nextCards;
}
