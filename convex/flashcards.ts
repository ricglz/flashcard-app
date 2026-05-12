import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner } from "./userSets";
import { validateCardFields, type CardFieldsValidationFailure } from "./domain/cardFields";
import { fail, ok, unauthenticated, notFound, type CommonFailure } from "./domain/result";

function validateAgainstSet(
  set: { fieldDefinitions: Array<{ name: string }> },
  fields: Record<string, string>
) {
  return validateCardFields(
    set.fieldDefinitions.map((field) => field.name),
    fields
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const owner = await assertOwner(ctx, identity.tokenIdentifier, args.setId);
    if (!owner.ok) return owner;
    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));
    const fields = validateAgainstSet(set, args.fields);
    if (!fields.ok) return fields;
    const id = await ctx.db.insert("flashcards", {
      setId: args.setId,
      fields: fields.value,
      order: args.order,
    });
    return id;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const owner = await assertOwner(ctx, identity.tokenIdentifier, args.setId);
    if (!owner.ok) return owner;
    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));

    const normalizedCards: Array<{ fields: Record<string, string>; order: number }> = [];
    for (const card of args.cards) {
      const fields = validateAgainstSet(set, card.fields);
      if (!fields.ok) return fields;
      normalizedCards.push({ fields: fields.value, order: card.order });
    }

    const ids = [];
    for (const card of normalizedCards) {
      const id = await ctx.db.insert("flashcards", {
        setId: args.setId,
        ...card,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const update = mutation({
  args: {
    id: v.id("flashcards"),
    fields: v.optional(v.record(v.string(), v.string())),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const card = await ctx.db.get(args.id);
    if (!card) return fail(notFound("Card not found"));
    const owner = await assertOwner(ctx, identity.tokenIdentifier, card.setId);
    if (!owner.ok) return owner;

    const patch: { fields?: Record<string, string>; order?: number } = {};
    if (args.fields !== undefined) {
      const set = await ctx.db.get(card.setId);
      if (!set) return fail(notFound("Set not found"));
      const fields = validateAgainstSet(set, args.fields);
      if (!fields.ok) return fields;
      patch.fields = fields.value;
    }
    if (args.order !== undefined) patch.order = args.order;
    await ctx.db.patch(args.id, patch);
    return ok(null);
  },
});

export const remove = mutation({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const card = await ctx.db.get(args.id);
    if (!card) return fail(notFound("Card not found"));
    const owner = await assertOwner(ctx, identity.tokenIdentifier, card.setId);
    if (!owner.ok) return owner;
    await ctx.db.delete(args.id);
    return ok(null);
  },
});

export type FlashcardMutationFailure = CommonFailure | CardFieldsValidationFailure;
