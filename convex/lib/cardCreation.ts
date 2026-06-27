import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { validateCardFields } from "../domain/cardFields";
import { invalidInput, type CommonFailure, type DomainResult } from "../domain/result";
import {
  stripEmptyTokenAnnotations,
  validateTokenAnnotationsForCard,
  type TokenAnnotationValidationFailure,
} from "../domain/tokenAnnotations";
import type { FlashcardOrigin } from "../../src/lib/types";
import type { TokenAnnotations } from "../../src/lib/types";
import {
  enrollCardsForEnabledSetUsers,
  ensureSrsCardForCard,
} from "./srsEnrollment";

export const MAX_CARDS_PER_SET = 1000;
export const MAX_CARDS_PER_BATCH = 200;

export type CardInsertInput = {
  fields: Record<string, string>;
  tokenAnnotations: TokenAnnotations;
  order: number;
};

export type CardCreationSet = Pick<
  Doc<"flashcardSets">,
  "_id" | "cardCount" | "fieldDefinitions"
>;

export type CardCreationSrsEnrollment =
  | { kind: "none" }
  | { kind: "enabledUsersForSet" }
  | { kind: "specificUser"; userId: string };

export type CreatedCards = {
  cardIds: Id<"flashcards">[];
  cardCount: number;
  updatedAt: number;
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

function validateCardSetLimit(
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

async function enrollCreatedCards(
  ctx: MutationCtx,
  {
    setId,
    cardIds,
    srsEnrollment,
  }: {
    setId: Id<"flashcardSets">;
    cardIds: readonly Id<"flashcards">[];
    srsEnrollment: CardCreationSrsEnrollment;
  },
) {
  if (cardIds.length === 0) return;

  switch (srsEnrollment.kind) {
    case "none":
      return;
    case "enabledUsersForSet":
      await enrollCardsForEnabledSetUsers(ctx, { setId, cardIds });
      return;
    case "specificUser":
      for (const cardId of cardIds) {
        await ensureSrsCardForCard(ctx, {
          userId: srsEnrollment.userId,
          setId,
          cardId,
        });
      }
      return;
  }
}

async function insertCards(
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
): Promise<DomainResult<Id<"flashcards">[], CommonFailure | TokenAnnotationValidationFailure>> {
  const validatedCards: CardInsertInput[] = [];
  for (const card of cards) {
    const validated = validateCardFields(fieldNames, card.fields);
    if (!validated.ok) return { ok: false, error: invalidInput(validated.error.message) };
    const validatedAnnotations = validateTokenAnnotationsForCard({
      validFieldNames: fieldNames,
      fields: validated.value,
      tokenAnnotations: card.tokenAnnotations,
    });
    if (!validatedAnnotations.ok) return validatedAnnotations;
    const tokenAnnotations = stripEmptyTokenAnnotations(validatedAnnotations.value) ?? {};
    validatedCards.push({ fields: validated.value, tokenAnnotations, order: card.order });
  }

  const ids: Id<"flashcards">[] = [];
  for (const card of validatedCards) {
    ids.push(await ctx.db.insert("flashcards", {
      setId,
      fields: card.fields,
      ...(Object.keys(card.tokenAnnotations).length === 0 ? {} : { tokenAnnotations: card.tokenAnnotations }),
      order: card.order,
      origin,
    }));
  }
  return { ok: true, value: ids };
}

export async function appendCardsToSet(
  ctx: MutationCtx,
  {
    set,
    cards,
    origin,
    srsEnrollment,
  }: {
    set: CardCreationSet;
    cards: readonly CardInsertInput[];
    origin: FlashcardOrigin;
    srsEnrollment: CardCreationSrsEnrollment;
  },
): Promise<DomainResult<CreatedCards, CommonFailure | TokenAnnotationValidationFailure>> {
  const limitCheck = validateCardSetLimit(set.cardCount, cards.length);
  if (!limitCheck.ok) return limitCheck;

  const inserted = await insertCards(ctx, {
    setId: set._id,
    fieldNames: set.fieldDefinitions.map((field) => field.name),
    cards,
    origin,
  });
  if (!inserted.ok) return inserted;

  const nextCardCount = set.cardCount + inserted.value.length;
  const updatedAt = Date.now();
  await ctx.db.patch(set._id, {
    cardCount: nextCardCount,
    updatedAt,
  });
  await enrollCreatedCards(ctx, {
    setId: set._id,
    cardIds: inserted.value,
    srsEnrollment,
  });

  return {
    ok: true,
    value: {
      cardIds: inserted.value,
      cardCount: nextCardCount,
      updatedAt,
    },
  };
}

export async function appendGeneratedCardsToSet(
  ctx: MutationCtx,
  {
    set,
    cards,
    srsEnrollment,
  }: {
    set: CardCreationSet & Pick<Doc<"flashcardSets">, "origin">;
    cards: readonly CardInsertInput[];
    srsEnrollment: CardCreationSrsEnrollment;
  },
): Promise<DomainResult<CreatedCards, CommonFailure | TokenAnnotationValidationFailure>> {
  const appended = await appendCardsToSet(ctx, {
    set,
    cards,
    origin: { kind: "ai_generated" },
    srsEnrollment,
  });
  if (!appended.ok) return appended;

  if (set.origin.kind !== "ai_generated") {
    await ctx.db.patch(set._id, {
      origin: { kind: "mixed" },
      updatedAt: appended.value.updatedAt,
    });
  }

  return appended;
}

export async function createInitialCardsForSet(
  ctx: MutationCtx,
  {
    set,
    cards,
    origin,
    srsEnrollment,
  }: {
    set: CardCreationSet & Pick<Doc<"flashcardSets">, "updatedAt">;
    cards: readonly CardInsertInput[];
    origin: FlashcardOrigin;
    srsEnrollment: CardCreationSrsEnrollment;
  },
): Promise<DomainResult<CreatedCards, CommonFailure | TokenAnnotationValidationFailure>> {
  const limitCheck = validateCardSetLimit(0, cards.length);
  if (!limitCheck.ok) return limitCheck;

  if (set.cardCount !== cards.length) {
    return {
      ok: false,
      error: invalidInput("Initial card count must match the cards being created."),
    };
  }

  const inserted = await insertCards(ctx, {
    setId: set._id,
    fieldNames: set.fieldDefinitions.map((field) => field.name),
    cards,
    origin,
  });
  if (!inserted.ok) return inserted;

  await enrollCreatedCards(ctx, {
    setId: set._id,
    cardIds: inserted.value,
    srsEnrollment,
  });

  return {
    ok: true,
    value: {
      cardIds: inserted.value,
      cardCount: set.cardCount,
      updatedAt: set.updatedAt,
    },
  };
}

export type CardInsertInputWithOrigin = CardInsertInput & {
  origin?: FlashcardOrigin;
};

async function insertCardsWithOrigins(
  ctx: MutationCtx,
  {
    setId,
    fieldNames,
    cards,
    defaultOrigin,
  }: {
    setId: Id<"flashcardSets">;
    fieldNames: readonly string[];
    cards: readonly CardInsertInputWithOrigin[];
    defaultOrigin: FlashcardOrigin;
  },
): Promise<DomainResult<Id<"flashcards">[], CommonFailure | TokenAnnotationValidationFailure>> {
  const validatedCards: {
    fields: Record<string, string>;
    tokenAnnotations: TokenAnnotations;
    order: number;
    origin: FlashcardOrigin;
  }[] = [];
  for (const card of cards) {
    const validated = validateCardFields(fieldNames, card.fields);
    if (!validated.ok) return { ok: false, error: invalidInput(validated.error.message) };
    const validatedAnnotations = validateTokenAnnotationsForCard({
      validFieldNames: fieldNames,
      fields: validated.value,
      tokenAnnotations: card.tokenAnnotations,
    });
    if (!validatedAnnotations.ok) return validatedAnnotations;
    const tokenAnnotations = stripEmptyTokenAnnotations(validatedAnnotations.value) ?? {};
    validatedCards.push({
      fields: validated.value,
      tokenAnnotations,
      order: card.order,
      origin: card.origin ?? defaultOrigin,
    });
  }

  const ids: Id<"flashcards">[] = [];
  for (const card of validatedCards) {
    ids.push(await ctx.db.insert("flashcards", {
      setId,
      fields: card.fields,
      ...(Object.keys(card.tokenAnnotations).length === 0 ? {} : { tokenAnnotations: card.tokenAnnotations }),
      order: card.order,
      origin: card.origin,
    }));
  }
  return { ok: true, value: ids };
}

export async function createInitialCardsForSetWithOrigins(
  ctx: MutationCtx,
  {
    set,
    cards,
    defaultOrigin,
    srsEnrollment,
  }: {
    set: CardCreationSet & Pick<Doc<"flashcardSets">, "updatedAt">;
    cards: readonly CardInsertInputWithOrigin[];
    defaultOrigin: FlashcardOrigin;
    srsEnrollment: CardCreationSrsEnrollment;
  },
): Promise<DomainResult<CreatedCards, CommonFailure | TokenAnnotationValidationFailure>> {
  const limitCheck = validateCardSetLimit(0, cards.length);
  if (!limitCheck.ok) return limitCheck;

  if (set.cardCount !== cards.length) {
    return {
      ok: false,
      error: invalidInput("Initial card count must match the cards being created."),
    };
  }

  const inserted = await insertCardsWithOrigins(ctx, {
    setId: set._id,
    fieldNames: set.fieldDefinitions.map((field) => field.name),
    cards,
    defaultOrigin,
  });
  if (!inserted.ok) return inserted;

  await enrollCreatedCards(ctx, {
    setId: set._id,
    cardIds: inserted.value,
    srsEnrollment,
  });

  return {
    ok: true,
    value: {
      cardIds: inserted.value,
      cardCount: set.cardCount,
      updatedAt: set.updatedAt,
    },
  };
}
