import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { validateCardFields } from "../domain/cardFields";
import { invalidInput, type CommonFailure, type DomainResult } from "../domain/result";
import type { FlashcardOrigin } from "../../src/lib/types";

export type CardInsertInput = {
  fields: Record<string, string>;
  order: number;
};

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
