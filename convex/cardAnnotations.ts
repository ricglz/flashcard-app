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
