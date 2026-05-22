import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Effect from "effect/Effect";
import { assertOwnerEffect, requireSetContentAccessEffect } from "./userSets";
import { validateCardFieldsEffect, type CardFieldsValidationFailure } from "./domain/cardFields";
import type { CommonFailure } from "./domain/result";
import { normalizeIdEffect, requireAuth, requireEntity, toDomainResultAsync } from "./domain/effect";

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
  args: { setId: v.string() },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const setId = yield* normalizeIdEffect<"flashcardSets">(
        ctx,
        "flashcardSets",
        args.setId,
        "Set not found",
      );
      yield* requireSetContentAccessEffect(ctx, setId);
      return yield* Effect.promise(() =>
        ctx.db
          .query("flashcards")
          .withIndex("by_setId", (q) => q.eq("setId", setId))
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
      const fields = yield* validateAgainstSetEffect(set, args.fields);
      const id = yield* Effect.promise(() =>
        ctx.db.insert("flashcards", { setId: args.setId, fields, order: args.order }),
      );
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
      const normalizedCards: Array<{ fields: Record<string, string>; order: number }> = [];
      for (const card of args.cards) {
        const fields = yield* validateAgainstSetEffect(set, card.fields);
        normalizedCards.push({ fields, order: card.order });
      }
      const ids = [];
      for (const card of normalizedCards) {
        const id = yield* Effect.promise(() =>
          ctx.db.insert("flashcards", { setId: args.setId, ...card }),
        );
        ids.push(id);
      }
      yield* Effect.promise(() =>
        ctx.db.patch(args.setId, {
          cardCount: set.cardCount + normalizedCards.length,
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
