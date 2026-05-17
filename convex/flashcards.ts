import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Effect from "effect/Effect";
import { assertOwner, assertOwnerEffect } from "./userSets";
import { validateCardFields, validateCardFieldsEffect, type CardFieldsValidationFailure } from "./domain/cardFields";
import { fail, ok, unauthenticated, notFound, type CommonFailure } from "./domain/result";
import { requireAuth, requireEntity, toDomainResultAsync } from "./domain/effect";

function validateAgainstSet(
  set: { fieldDefinitions: Array<{ name: string }> },
  fields: Record<string, string>
) {
  return validateCardFields(
    set.fieldDefinitions.map((field) => field.name),
    fields
  );
}

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
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.setId))
      .take(1000);
  },
});

export const create = mutation({
  args: {
    setId: v.id("flashcardSets"),
    fields: v.record(v.string(), v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const validated = await toDomainResultAsync(
      Effect.gen(function* () {
        const identity = yield* requireAuth(ctx);
        yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.setId);
        const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
        const fields = yield* validateAgainstSetEffect(set, args.fields);
        return { set, fields };
      }),
    );
    if (!validated.ok) return validated;
    const { set, fields } = validated.value;

    const id = await ctx.db.insert("flashcards", {
      setId: args.setId,
      fields,
      order: args.order,
    });
    await ctx.db.patch(args.setId, { cardCount: set.cardCount + 1, updatedAt: Date.now() });
    return ok(id);
  },
});

export const batchCreate = mutation({
  args: {
    setId: v.id("flashcardSets"),
    cards: v.array(
      v.object({
        fields: v.record(v.string(), v.string()),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const validated = await toDomainResultAsync(
      Effect.gen(function* () {
        const identity = yield* requireAuth(ctx);
        yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.setId);
        const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
        const normalizedCards: Array<{ fields: Record<string, string>; order: number }> = [];
        for (const card of args.cards) {
          const fields = yield* validateAgainstSetEffect(set, card.fields);
          normalizedCards.push({ fields, order: card.order });
        }
        return { set, normalizedCards };
      }),
    );
    if (!validated.ok) return validated;
    const { set, normalizedCards } = validated.value;

    const ids = [];
    for (const card of normalizedCards) {
      const id = await ctx.db.insert("flashcards", {
        setId: args.setId,
        ...card,
      });
      ids.push(id);
    }
    await ctx.db.patch(args.setId, {
      cardCount: set.cardCount + normalizedCards.length,
      updatedAt: Date.now(),
    });
    return ok(ids);
  },
});

export const update = mutation({
  args: {
    id: v.id("flashcards"),
    fields: v.optional(v.record(v.string(), v.string())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const validated = await toDomainResultAsync(
      Effect.gen(function* () {
        const identity = yield* requireAuth(ctx);
        const card = yield* requireEntity(ctx.db.get(args.id), "Card not found");
        yield* assertOwnerEffect(ctx, identity.tokenIdentifier, card.setId);
        let validatedFields: Record<string, string> | undefined;
        if (args.fields !== undefined) {
          const set = yield* requireEntity(ctx.db.get(card.setId), "Set not found");
          validatedFields = yield* validateAgainstSetEffect(set, args.fields);
        }
        return { card, validatedFields };
      }),
    );
    if (!validated.ok) return validated;
    const { card, validatedFields } = validated.value;

    const patch: { fields?: Record<string, string>; order?: number } = {};
    if (validatedFields !== undefined) patch.fields = validatedFields;
    if (args.order !== undefined) patch.order = args.order;
    await ctx.db.patch(args.id, patch);
    await ctx.db.patch(card.setId, { updatedAt: Date.now() });
    return ok(null);
  },
});

export const remove = mutation({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    const validated = await toDomainResultAsync(
      Effect.gen(function* () {
        const identity = yield* requireAuth(ctx);
        const card = yield* requireEntity(ctx.db.get(args.id), "Card not found");
        yield* assertOwnerEffect(ctx, identity.tokenIdentifier, card.setId);
        return card;
      }),
    );
    if (!validated.ok) return validated;
    const card = validated.value;

    const set = await ctx.db.get(card.setId);
    await ctx.db.delete(args.id);
    if (set) {
      await ctx.db.patch(set._id, {
        cardCount: Math.max(0, set.cardCount - 1),
        updatedAt: Date.now(),
      });
    }
    return ok(null);
  },
});

export type FlashcardMutationFailure = CommonFailure | CardFieldsValidationFailure;
