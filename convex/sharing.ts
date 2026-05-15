import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { enrollCardsForSetHelper } from "./userSets";
import { fail, unauthenticated, notFound, conflict, forbidden } from "./domain/result";
import { getFieldDefinitions } from "./lib/typed";

export const addToLibrary = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());

    const set = await ctx.db.get(args.setId);
    if (!set) return fail(notFound("Set not found"));

    const visibility = set.visibility ?? "private";
    if (visibility === "private") return fail(forbidden("Cannot add a private set to your library."));

    const existing = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (existing) return fail(conflict("Set already in library"));

    const fieldDefs = getFieldDefinitions(set);
    const sorted = [...fieldDefs].sort((a, b) => a.order - b.order);
    const defaultFrontFields = sorted.length > 0 ? [sorted[0]!.name] : [];
    const defaultBackFields = sorted.slice(1).map((fd) => fd.name);

    const userSetId = await ctx.db.insert("userSets", {
      userId: identity.tokenIdentifier,
      setId: args.setId,
      role: "member",
      srsEnabled: true,
      defaultFrontFields,
      defaultBackFields,
      createdAt: Date.now(),
    });

    await enrollCardsForSetHelper(ctx, identity.tokenIdentifier, args.setId);

    return userSetId;
  },
});
