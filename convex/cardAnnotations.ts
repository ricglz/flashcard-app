import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, ok, unauthenticated } from "./domain/result";
import { assertMember } from "./userSets";

export const getForSet = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.tokenIdentifier;

    return ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .collect();
  },
});

export const getAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.tokenIdentifier;

    return ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getFlagged = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.tokenIdentifier;

    const flagged = await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_flagged", (q) =>
        q.eq("userId", userId).eq("flagged", true)
      )
      .collect();

    const setIds = [...new Set(flagged.map((a) => a.setId))];
    const sets = await Promise.all(setIds.map((id) => ctx.db.get(id)));
    const setMap = new Map(sets.filter(Boolean).map((s) => [s!._id, s!]));

    const cardIds = flagged.map((a) => a.cardId);
    const cards = await Promise.all(cardIds.map((id) => ctx.db.get(id)));
    const cardMap = new Map(cards.filter(Boolean).map((c) => [c!._id, c!]));

    return flagged
      .map((a) => {
        const card = cardMap.get(a.cardId);
        const set = setMap.get(a.setId);
        if (!card || !set) return null;
        return {
          annotationId: a._id,
          cardId: a.cardId,
          setId: a.setId,
          setName: set.name,
          fieldDefinitions: set.fieldDefinitions,
          fields: card.fields,
          note: a.note,
        };
      })
      .filter(Boolean);
  },
});

export const toggleFlag = mutation({
  args: {
    cardId: v.id("flashcards"),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const memberCheck = await assertMember(ctx, userId, args.setId);
    if (!memberCheck.ok) return memberCheck;

    const existing = await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { flagged: !existing.flagged });
      return ok({ flagged: !existing.flagged });
    }

    await ctx.db.insert("cardAnnotations", {
      userId,
      cardId: args.cardId,
      setId: args.setId,
      flagged: true,
    });
    return ok({ flagged: true });
  },
});

export const setNote = mutation({
  args: {
    cardId: v.id("flashcards"),
    setId: v.id("flashcardSets"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const memberCheck = await assertMember(ctx, userId, args.setId);
    if (!memberCheck.ok) return memberCheck;

    const trimmed = args.note.trim();

    const existing = await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        note: trimmed || undefined,
      });
      return ok({ note: trimmed || undefined });
    }

    await ctx.db.insert("cardAnnotations", {
      userId,
      cardId: args.cardId,
      setId: args.setId,
      flagged: false,
      note: trimmed || undefined,
    });
    return ok({ note: trimmed || undefined });
  },
});
