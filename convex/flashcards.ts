import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const set = await ctx.db.get(args.setId);
    if (!set || set.ownerId !== identity.tokenIdentifier) return [];
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
    const set = await ctx.db.get(args.setId);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");
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
    const set = await ctx.db.get(args.setId);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");
    const ids = [];
    for (const card of args.cards) {
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
    const set = await ctx.db.get(card.setId);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");
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
    const set = await ctx.db.get(card.setId);
    if (!set || set.ownerId !== identity.tokenIdentifier)
      throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
