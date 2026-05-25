export type RefinementScope = "all" | "included" | "excluded";

export type RefinementRequest = {
  instructions: string;
  model: string;
  scope: RefinementScope;
};

export type RefinementResult =
  | { kind: "applied" }
  | {
      kind: "not_applied";
      reason:
        | "missing_draft"
        | "provider_error"
        | "validation_error"
        | "count_mismatch"
        | "unexpected_error";
    };

type SelectableCard = {
  selected: boolean;
};

export type MergeRefinedCardsResult<T extends SelectableCard> =
  | { ok: true; cards: T[] }
  | {
      ok: false;
      expectedCount: number;
      actualCount: number;
      scope: RefinementScope;
    };

export function refinementScopeLabel(scope: RefinementScope) {
  if (scope === "all") return "all cards";
  return `${scope} cards`;
}

export function formatRefinementCountMismatch(
  result: Extract<MergeRefinedCardsResult<SelectableCard>, { ok: false }>,
) {
  return `Revision returned ${result.actualCount} cards for ${result.expectedCount} ${refinementScopeLabel(result.scope)}. Try refining all cards or adjust the instructions.`;
}

function isCardInScope(card: SelectableCard, scope: RefinementScope) {
  if (scope === "all") return true;
  return scope === "included" ? card.selected : !card.selected;
}

export function getRefinementIndexes<T extends SelectableCard>(
  cards: readonly T[],
  scope: RefinementScope,
): number[] {
  return cards.flatMap((card, index) => isCardInScope(card, scope) ? [index] : []);
}

export function getRefinementScopeCount<T extends SelectableCard>(
  cards: readonly T[],
  scope: RefinementScope,
): number {
  return getRefinementIndexes(cards, scope).length;
}

export function getCardsForRefinement<T extends SelectableCard>(
  cards: readonly T[],
  scope: RefinementScope,
): T[] {
  return cards.filter((card) => isCardInScope(card, scope));
}

export function mergeRefinedCards<T extends SelectableCard>(
  originalCards: readonly T[],
  refinedCards: readonly T[],
  scope: RefinementScope,
): MergeRefinedCardsResult<T> {
  const targetIndexes = getRefinementIndexes(originalCards, scope);
  if (targetIndexes.length !== refinedCards.length) {
    return {
      ok: false,
      expectedCount: targetIndexes.length,
      actualCount: refinedCards.length,
      scope,
    };
  }

  const merged = [...originalCards];
  targetIndexes.forEach((originalIndex, refinementIndex) => {
    const originalCard = originalCards[originalIndex];
    const refinedCard = refinedCards[refinementIndex];
    if (!originalCard || !refinedCard) return;
    merged[originalIndex] = {
      ...refinedCard,
      selected: originalCard.selected,
    };
  });

  return { ok: true, cards: merged };
}
