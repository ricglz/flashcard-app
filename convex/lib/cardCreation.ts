import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { validateCardFields } from "../domain/cardFields";
import { invalidInput, type CommonFailure, type DomainResult } from "../domain/result";
import type { FlashcardOrigin } from "../../src/lib/types";

export const MAX_CARDS_PER_SET = 1000;
export const MAX_CARDS_PER_BATCH = 200;

export type CardInsertInput = {
  fields: Record<string, string>;
  order: number;
};

export function validateCardBatchSize(
  cardCount: number,
): DomainResult<void, CommonFailure> {
  if (cardCount > MAX_CARDS_PER_BATCH) {
    return {
      ok: false,
      error: invalidInput(`Cannot create more than ${MAX_CARDS_PER_BATCH} cards at once.`),
    };
  }
  return { ok: true, value: undefined };
}

export function validateCardSetLimit(
  currentCardCount: number,
  addedCardCount: number,
): DomainResult<void, CommonFailure> {
  if (currentCardCount + addedCardCount > MAX_CARDS_PER_SET) {
    return {
      ok: false,
      error: invalidInput(`A set can contain at most ${MAX_CARDS_PER_SET} active cards.`),
    };
  }
  return { ok: true, value: undefined };
}

export async function insertCards(
  ctx: MutationCtx,
  {
    setId,
    fieldNames,
    cards,
    origin,
  }: {
    setId: Id<"flashcardSets">;
    fieldNames: readonly string[];
    cards: readonly CardInsertInput[];
    origin: FlashcardOrigin;
  },
): Promise<DomainResult<Id<"flashcards">[], CommonFailure>> {
  const validatedCards: CardInsertInput[] = [];
  for (const card of cards) {
    const validated = validateCardFields(fieldNames, card.fields);
    if (!validated.ok) return { ok: false, error: invalidInput(validated.error.message) };
    validatedCards.push({ fields: validated.value, order: card.order });
  }

  const ids: Id<"flashcards">[] = [];
  for (const card of validatedCards) {
    ids.push(await ctx.db.insert("flashcards", { setId, ...card, origin }));
  }
  return { ok: true, value: ids };
}
