import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Effect from "effect/Effect";
import { assertOwnerEffect, enrollNewCardForSrsUsers, requireSetContentAccessEffect } from "./userSets";
import { validateCardFieldsEffect, type CardFieldsValidationFailure } from "./domain/cardFields";
import { invalidInput, type CommonFailure } from "./domain/result";
import { fromDomainResult, requireAuth, requireEntity, toDomainResultAsync } from "./domain/effect";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";
import {
  insertCards,
  MAX_CARDS_PER_SET,
  validateCardBatchSize,
  validateCardSetLimit,
} from "./lib/cardCreation";

function validateAgainstSetEffect(
  set: { fieldDefinitions: Array<{ name: string }> },
  fields: Record<string, string>,
) {
  return validateCardFieldsEffect(
    set.fieldDefinitions.map((field) => field.name),
    fields,
  );
}

async function getActiveCardsForSet(
  ctx: QueryCtx,
  setId: Doc<"flashcards">["setId"],
) {
  const activeCards: Doc<"flashcards">[] = [];
  for await (
    const card of ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", setId))
  ) {
    if (card.archivedAt === undefined) activeCards.push(card);
    if (activeCards.length >= MAX_CARDS_PER_SET) break;
  }
  return activeCards;
}

export const list = query({
  args: { setId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      yield* requireSetContentAccessEffect(ctx, args.setId);
      return yield* Effect.promise(() => getActiveCardsForSet(ctx, args.setId));
    }),
  ),
});

export const create = mutation({
  args: {
    setId: v.id("flashcardSets"),
    fields: v.record(v.string(), v.string()),
    order: v.number(),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.setId);
      const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
      yield* fromDomainResult(validateCardSetLimit(set.cardCount, 1));
      const ids = yield* fromDomainResult(
        yield* Effect.promise(() =>
          insertCards(ctx, {
            setId: args.setId,
            fieldNames: set.fieldDefinitions.map((field) => field.name),
            cards: [{ fields: args.fields, order: args.order }],
            origin: "manual",
          }),
        ),
      );
      const id = ids[0];
      if (id === undefined) return yield* Effect.fail(invalidInput("No card was created."));
      yield* Effect.promise(() => enrollNewCardForSrsUsers(ctx, args.setId, id));
      yield* Effect.promise(() =>
        ctx.db.patch(args.setId, { cardCount: set.cardCount + 1, updatedAt: Date.now() }),
      );
      return id;
    }),
  ),
});

export const batchCreate = mutation({
  args: {
    setId: v.id("flashcardSets"),
    cards: v.array(
      v.object({
        fields: v.record(v.string(), v.string()),
        order: v.number(),
      }),
    ),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.setId);
      const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
      yield* fromDomainResult(validateCardBatchSize(args.cards.length));
      yield* fromDomainResult(validateCardSetLimit(set.cardCount, args.cards.length));
      const ids = yield* fromDomainResult(
        yield* Effect.promise(() =>
          insertCards(ctx, {
            setId: args.setId,
            fieldNames: set.fieldDefinitions.map((field) => field.name),
            cards: args.cards,
            origin: "manual",
          }),
        ),
      );
      for (const id of ids) {
        yield* Effect.promise(() => enrollNewCardForSrsUsers(ctx, args.setId, id));
      }
      yield* Effect.promise(() =>
        ctx.db.patch(args.setId, {
          cardCount: set.cardCount + ids.length,
          updatedAt: Date.now(),
        }),
      );
      return ids;
    }),
  ),
});

export const update = mutation({
  args: {
    id: v.id("flashcards"),
    fields: v.optional(v.record(v.string(), v.string())),
    order: v.optional(v.number()),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const card = yield* requireEntity(ctx.db.get(args.id), "Card not found");
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, card.setId);
      const patch: { fields?: Record<string, string>; order?: number } = {};
      if (args.fields !== undefined) {
        const set = yield* requireEntity(ctx.db.get(card.setId), "Set not found");
        patch.fields = yield* validateAgainstSetEffect(set, args.fields);
      }
      if (args.order !== undefined) patch.order = args.order;
      yield* Effect.promise(() => ctx.db.patch(args.id, patch));
      yield* Effect.promise(() => ctx.db.patch(card.setId, { updatedAt: Date.now() }));
      return null;
    }),
  ),
});

export const remove = mutation({
  args: { id: v.id("flashcards") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const card = yield* requireEntity(ctx.db.get(args.id), "Card not found");
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, card.setId);
      const set = yield* Effect.promise(() => ctx.db.get(card.setId));
      if (card.archivedAt !== undefined) return null;
      const archivedAt = Date.now();

      yield* Effect.promise(() =>
        deleteAllMatching(
          ctx,
          () => ctx.db.query("srsCards").withIndex("by_cardId", (q) => q.eq("cardId", args.id)).take(DELETION_BATCH_SIZE),
          async (ctx, srsCard) => {
            await deleteAllMatching(
              ctx,
              () => ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id)).take(DELETION_BATCH_SIZE),
            );
          },
        ),
      );

      yield* Effect.promise(() =>
        deleteAllMatching(
          ctx,
          () => ctx.db.query("cardAnnotations").withIndex("by_cardId", (q) => q.eq("cardId", args.id)).take(DELETION_BATCH_SIZE),
        ),
      );

      yield* Effect.promise(async () => {
        for await (
          const session of ctx.db
            .query("studySessions")
            .withIndex("by_setId_and_userId", (q) => q.eq("setId", card.setId))
        ) {
          if (session.status === "in_progress" && session.cardOrder.includes(args.id)) {
            await ctx.db.patch(session._id, {
              status: "abandoned" as const,
              completedAt: archivedAt,
            });
          }
        }
      });

      yield* Effect.promise(() => ctx.db.patch(args.id, { archivedAt }));
      if (set) {
        yield* Effect.promise(() =>
          ctx.db.patch(set._id, {
            cardCount: Math.max(0, set.cardCount - 1),
            updatedAt: Date.now(),
          }),
        );
      }
      return null;
    }),
  ),
});

export type FlashcardMutationFailure = CommonFailure | CardFieldsValidationFailure;
export type FlashcardListFailure = CommonFailure;
