import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { conflict, fail, invalidInput, notFound, ok, unauthenticated } from "./domain/result";
import { assertMember } from "./userSets";
import { getFieldDefinitions } from "./lib/typed";

const NOTE_MAX_LENGTH = 500;

export const getForSet = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    return ok(await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .collect());
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    return ok(await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect());
  },
});

export const getFlagged = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;

    const flagged = await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_flagged", (q) =>
        q.eq("userId", userId).eq("flagged", true)
      )
      .collect();

    const setIds = [...new Set(flagged.map((a) => a.setId))];
    const perSetData = await Promise.all(
      setIds.map(async (setId) => {
        const [set, userSet] = await Promise.all([
          ctx.db.get(setId),
          ctx.db
            .query("userSets")
            .withIndex("by_userId_and_setId", (q) =>
              q.eq("userId", userId).eq("setId", setId)
            )
            .first(),
        ]);
        return { setId, set, userSet };
      })
    );

    const setMap = new Map<
      string,
      { name: string; fieldDefinitions: ReturnType<typeof getFieldDefinitions> }
    >();
    const userSetMap = new Map<
      string,
      {
        defaultFrontFields: string[];
        defaultBackFields: string[];
        defaultTtsOnlyFields: string[];
      }
    >();

    for (const { setId, set, userSet } of perSetData) {
      if (!set || !userSet) continue;
      setMap.set(setId, { name: set.name, fieldDefinitions: getFieldDefinitions(set) });
      userSetMap.set(setId, {
        defaultFrontFields: userSet.defaultFrontFields,
        defaultBackFields: userSet.defaultBackFields,
        defaultTtsOnlyFields: userSet.defaultTtsOnlyFields,
      });
    }

    const cardIds = flagged.map((a) => a.cardId);
    const cards = await Promise.all(cardIds.map((id) => ctx.db.get(id)));
    const cardMap = new Map(
      cards.flatMap((card) => card === null ? [] : [[card._id, card] as const])
    );

    return ok(
      flagged.flatMap((a) => {
        const card = cardMap.get(a.cardId);
        const setData = setMap.get(a.setId);
        const userSetData = userSetMap.get(a.setId);
        if (!card || !setData || !userSetData) return [];
        return [{
          annotationId: a._id,
          cardId: a.cardId,
          setId: a.setId,
          setName: setData.name,
          fieldDefinitions: setData.fieldDefinitions,
          fields: card.fields,
          note: a.note,
          frontFields: userSetData.defaultFrontFields,
          backFields: userSetData.defaultBackFields,
          ttsOnlyFields: userSetData.defaultTtsOnlyFields,
        }];
      })
    );
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

export const addAiNoteToCurrentCard = mutation({
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

    const card = await ctx.db.get(args.cardId);
    if (!card || card.setId !== args.setId) {
      return fail(notFound("Card not found."));
    }

    const trimmed = args.note.trim();
    if (!trimmed) {
      return fail(invalidInput("Note must not be blank.", "note"));
    }
    if (trimmed.length > NOTE_MAX_LENGTH) {
      return fail(invalidInput("Note must be 500 characters or fewer.", "note"));
    }

    const existing = await ctx.db
      .query("cardAnnotations")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", userId).eq("cardId", args.cardId)
      )
      .first();

    if (existing?.note?.trim()) {
      return fail(conflict("This card already has a note."));
    }

    if (existing) {
      await ctx.db.patch(existing._id, { note: trimmed });
      return ok({ note: trimmed });
    }

    await ctx.db.insert("cardAnnotations", {
      userId,
      cardId: args.cardId,
      setId: args.setId,
      flagged: false,
      note: trimmed,
    });
    return ok({ note: trimmed });
  },
});
