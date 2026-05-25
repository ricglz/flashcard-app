import type { FunctionArgs } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { GeneratedSetPayload } from "./aiToolingSchemas";
import {
  formatRefinementCountMismatch,
  mergeRefinedCards,
  type RefinementScope,
} from "./refinementScope";

type RefineDraft = FunctionArgs<typeof api.ai.refineGeneratedSet>["draft"];
export type DraftCard = Pick<GeneratedSetPayload["cards"][number], "fields" | "sourceCardIds" | "rationale">;
type SelectableDraftCard = DraftCard & { selected: boolean };
type RefinedPayloadMergeResult<T extends SelectableDraftCard> =
  | { ok: true; cards: T[]; payload: GeneratedSetPayload }
  | { ok: false; message: string };

export function cloneFieldDefinitionsForAction(
  fieldDefinitions: GeneratedSetPayload["fieldDefinitions"],
): RefineDraft["fieldDefinitions"] {
  return fieldDefinitions.map((field) => ({
    name: field.name,
    role: field.role,
    metadata: field.metadata.tts
      ? { tts: { lang: field.metadata.tts.lang } }
      : {},
    order: field.order,
  }));
}

export function cloneGeneratedSetForAction(
  payload: GeneratedSetPayload,
  cards: ReadonlyArray<DraftCard> = payload.cards,
): RefineDraft {
  return {
    name: payload.name,
    description: payload.description,
    sourceSetIds: [...payload.sourceSetIds],
    sourceScope: payload.sourceScope,
    weakContextMethodology: payload.weakContextMethodology,
    fieldDefinitions: cloneFieldDefinitionsForAction(payload.fieldDefinitions),
    cards: cards.map((card) => ({
      fields: { ...card.fields },
      sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
      rationale: card.rationale,
    })),
    addToSrs: payload.addToSrs,
  };
}

export function cloneGeneratedCardsForPayload(
  cards: ReadonlyArray<DraftCard>,
): GeneratedSetPayload["cards"] {
  return cards.map((card) => ({
    fields: { ...card.fields },
    sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
    rationale: card.rationale,
  }));
}

export function mergeRefinedPayloadCards<T extends SelectableDraftCard>(
  currentCards: readonly T[],
  refinedPayload: GeneratedSetPayload,
  scope: RefinementScope,
  cardsFromPayload: (payload: GeneratedSetPayload) => T[],
): RefinedPayloadMergeResult<T> {
  const mergeResult = mergeRefinedCards(currentCards, cardsFromPayload(refinedPayload), scope);
  if (!mergeResult.ok) {
    return { ok: false, message: formatRefinementCountMismatch(mergeResult) };
  }
  return {
    ok: true,
    cards: mergeResult.cards,
    payload: {
      ...refinedPayload,
      cards: cloneGeneratedCardsForPayload(mergeResult.cards),
    },
  };
}
