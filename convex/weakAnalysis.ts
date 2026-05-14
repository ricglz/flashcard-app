import { v } from "convex/values";
import { query } from "./_generated/server";
import { weakContextMethodologyValidator } from "./schema";
import { getWeakCardsHelper } from "./tooling";

export const getMyWeakCards = query({
  args: {
    methodology: v.optional(weakContextMethodologyValidator),
    setId: v.optional(v.id("flashcardSets")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const scope = args.setId
      ? { kind: "set" as const, setId: args.setId }
      : { kind: "srs_enabled_sets" as const };
    return getWeakCardsHelper(ctx, {
      userId: identity.tokenIdentifier,
      scope,
      methodology: args.methodology,
      include: { recentRatings: true },
    });
  },
});
