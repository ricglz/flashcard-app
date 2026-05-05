import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { SRS_DEFAULTS } from "./srs";

const DEFAULTS = { maxNewCardsPerDay: SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY };

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();
    return settings ?? DEFAULTS;
  },
});

export const update = mutation({
  args: {
    maxNewCardsPerDay: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        maxNewCardsPerDay: args.maxNewCardsPerDay,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        maxNewCardsPerDay: args.maxNewCardsPerDay,
      });
    }
  },
});
