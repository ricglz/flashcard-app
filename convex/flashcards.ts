import { Effect, Either } from "effect";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertMember, assertOwner } from "./userSets";
import type { Doc } from "./_generated/dataModel";

type CardFieldsValidationError =
  | { readonly _tag: "UnknownCardField"; readonly fieldName: string }
  | { readonly _tag: "EmptyCardFields" };

function validateCardFieldsEffect(
  set: Doc<"flashcardSets">,
  fields: Record<string, string>
): Effect.Effect<void, CardFieldsValidationError> {
  const validFieldNames = new Set(
    set.fieldDefinitions.map((field) => field.name)
  );
  const fieldNames = Object.keys(fields);

  for (const fieldName of fieldNames) {
    if (!validFieldNames.has(fieldName)) {
      return Effect.fail({ _tag: "UnknownCardField", fieldName });
    }
  }

  if (!fieldNames.some((fieldName) => fields[fieldName].trim().length > 0)) {
    return Effect.fail({ _tag: "EmptyCardFields" });
  }

  return Effect.void;
}

function toCardFieldsValidationError(error: CardFieldsValidationError): Error {
  switch (error._tag) {
    case "UnknownCardField":
      return new Error(`Unknown field: ${error.fieldName}`);
    case "EmptyCardFields":
      return new Error("At least one field value is required");
  }
}

function validateCardFields(
  set: Doc<"flashcardSets">,
  fields: Record<string, string>
) {
  const result = Effect.runSync(
    Effect.either(validateCardFieldsEffect(set, fields))
  );
  if (Either.isLeft(result)) {
    throw toCardFieldsValidationError(result.left);
  }
}

export const list = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    try {
      await assertMember(ctx, identity.tokenIdentifier, args.setId);
    } catch {
      return [];
    }
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
    if (!identity) throw new Error("Not authenticated");
    await assertOwner(ctx, identity.tokenIdentifier, args.setId);
    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");
    validateCardFields(set, args.fields);
    return await ctx.db.insert("flashcards", args);
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
    if (!identity) throw new Error("Not authenticated");
    await assertOwner(ctx, identity.tokenIdentifier, args.setId);
    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");
    const ids = [];
    for (const card of args.cards) {
      validateCardFields(set, card.fields);
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
    if (!identity) throw new Error("Not authenticated");
    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Not found");
    await assertOwner(ctx, identity.tokenIdentifier, card.setId);
    if (args.fields !== undefined) {
      const set = await ctx.db.get(card.setId);
      if (!set) throw new Error("Set not found");
      validateCardFields(set, args.fields);
    }
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const card = await ctx.db.get(args.id);
    if (!card) throw new Error("Not found");
    await assertOwner(ctx, identity.tokenIdentifier, card.setId);
    await ctx.db.delete(args.id);
  },
});
