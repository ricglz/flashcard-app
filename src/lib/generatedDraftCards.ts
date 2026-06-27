import type { GeneratedSetPayload } from "./aiToolingSchemas";
import type { DraftCard } from "./generatedSetDraft";
import type { FunctionArgs } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { cloneTokenAnnotations } from "./tokenAnnotations";
import type { TokenAnnotations } from "./types";

export type GeneratedDraftCard = Omit<GeneratedSetPayload["cards"][number], "tokenAnnotations"> & {
  tokenAnnotations?: TokenAnnotations;
  selected: boolean;
};

type ConfirmGeneratedSetCards = FunctionArgs<typeof api.ai.confirmGeneratedSet>["cards"];

export function generatedCardsFromPayload(
  payload: GeneratedSetPayload,
): GeneratedDraftCard[] {
  return payload.cards.map((card) => ({
    fields: { ...card.fields },
    ...(card.tokenAnnotations === undefined
      ? {}
      : { tokenAnnotations: cloneTokenAnnotations(card.tokenAnnotations) }),
    sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
    rationale: card.rationale,
    selected: true,
  }));
}

export function selectedCardsForConfirm(
  cards: readonly GeneratedDraftCard[],
): ConfirmGeneratedSetCards {
  return cards
    .filter((card) => card.selected)
    .map((card) => ({
      fields: { ...card.fields },
      ...(card.tokenAnnotations === undefined
        ? {}
        : { tokenAnnotations: cloneTokenAnnotations(card.tokenAnnotations) }),
      sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
      rationale: card.rationale,
    }));
}

export function selectedCardsForAppend(
  cards: readonly GeneratedDraftCard[],
): Pick<DraftCard, "fields" | "tokenAnnotations" | "rationale">[] {
  return cards
    .filter((card) => card.selected)
    .map((card) => ({
      fields: { ...card.fields },
      ...(card.tokenAnnotations === undefined
        ? {}
        : { tokenAnnotations: cloneTokenAnnotations(card.tokenAnnotations) }),
      rationale: card.rationale,
    }));
}

export function includedCards(
  cards: readonly GeneratedDraftCard[],
): Array<{ fields: Record<string, string>; tokenAnnotations?: GeneratedDraftCard["tokenAnnotations"] }> {
  return cards
    .filter((card) => card.selected)
    .map((card) => ({
      fields: { ...card.fields },
      ...(card.tokenAnnotations === undefined
        ? {}
        : { tokenAnnotations: cloneTokenAnnotations(card.tokenAnnotations) }),
    }));
}

export function includedCardFields(cards: readonly GeneratedDraftCard[]): Record<string, string>[] {
  return includedCards(cards).map((card) => card.fields);
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
  const remainingAnnotations = { ...(card.tokenAnnotations ?? {}) };
  delete remainingAnnotations[key];
  nextCards[index] = {
    ...card,
    fields: { ...card.fields, [key]: value },
    tokenAnnotations: Object.keys(remainingAnnotations).length > 0 ? remainingAnnotations : undefined,
  };
  return nextCards;
}
