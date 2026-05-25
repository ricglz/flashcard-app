import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Effect from "effect/Effect";
import { assertOwnerEffect, enrollNewCardForSrsUsers, requireSetContentAccessEffect } from "./userSets";
import { validateCardFieldsEffect, type CardFieldsValidationFailure } from "./domain/cardFields";
import { invalidInput, type CommonFailure } from "./domain/result";
import { fromDomainResult, requireAuth, requireEntity, toDomainResultAsync } from "./domain/effect";
import { insertCards } from "./lib/cardCreation";

function validateAgainstSetEffect(
  set: { fieldDefinitions: Array<{ name: string }> },
  fields: Record<string, string>,
) {
  return validateCardFieldsEffect(
    set.fieldDefinitions.map((field) => field.name),
    fields,
  );
}

export const list = query({
  args: { setId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      yield* requireSetContentAccessEffect(ctx, args.setId);
      return yield* Effect.promise(() =>
        ctx.db
          .query("flashcards")
          .withIndex("by_setId", (q) => q.eq("setId", args.setId))
          .take(1000),
      );
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
      yield* Effect.promise(() => ctx.db.delete(args.id));
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
