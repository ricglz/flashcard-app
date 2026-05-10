import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { FieldDefinition } from "../src/lib/types";
import { enrollCardsForSetHelper } from "./userSets";

export const addToLibrary = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");

    const existing = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (existing) throw new Error("Set already in library");

    const fieldDefs = set.fieldDefinitions as FieldDefinition[];
    const sorted = [...fieldDefs].sort((a, b) => a.order - b.order);
    const defaultFrontFields = sorted.length > 0 ? [sorted[0].name] : [];
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
