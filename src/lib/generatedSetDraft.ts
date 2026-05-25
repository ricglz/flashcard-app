import type { FunctionArgs, FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { GeneratedSetPayload } from "./aiToolingSchemas";
import {
  formatRefinementCountMismatch,
  getCardsForRefinement,
  mergeRefinedCards,
  type RefinementResult,
  type RefinementScope,
} from "./refinementScope";

type RefineDraft = FunctionArgs<typeof api.ai.refineGeneratedSet>["draft"];
type RefineResult = FunctionReturnType<typeof api.ai.refineGeneratedSet>;
export type DraftCard = Pick<GeneratedSetPayload["cards"][number], "fields" | "sourceCardIds" | "rationale">;
type SelectableDraftCard = DraftCard & { selected: boolean };
type AppliedRefinement<T extends SelectableDraftCard> = {
  kind: "applied";
  cards: T[];
  payload: GeneratedSetPayload;
};
type UnappliedRefinement = Extract<RefinementResult, { kind: "not_applied" }> & {
  message: string;
};
type RefinedPayloadMergeResult<T extends SelectableDraftCard> = AppliedRefinement<T> | UnappliedRefinement;

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

export function cloneScopedGeneratedSetForAction(
  payload: GeneratedSetPayload,
  cards: ReadonlyArray<SelectableDraftCard>,
  scope: RefinementScope,
): RefineDraft {
  return cloneGeneratedSetForAction(payload, getCardsForRefinement(cards, scope));
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
    return {
      kind: "not_applied",
      reason: "count_mismatch",
      message: formatRefinementCountMismatch(mergeResult),
    };
  }
  return {
    kind: "applied",
    cards: mergeResult.cards,
    payload: {
      ...refinedPayload,
      cards: cloneGeneratedCardsForPayload(mergeResult.cards),
    },
  };
}

export function resolveRefinedPayload<T extends SelectableDraftCard>(
  result: RefineResult,
  currentCards: readonly T[],
  scope: RefinementScope,
  cardsFromPayload: (payload: GeneratedSetPayload) => T[],
): RefinedPayloadMergeResult<T> {
  if (!result.ok) {
    return { kind: "not_applied", reason: "provider_error", message: result.error.message };
  }
  if (!result.value.validation.ok) {
    return {
      kind: "not_applied",
      reason: "validation_error",
      message: `Validation issues: ${result.value.validation.issues.join(", ")}`,
    };
  }
  return mergeRefinedPayloadCards(currentCards, result.value.payload, scope, cardsFromPayload);
}
