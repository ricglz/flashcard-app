import { v } from "convex/values";
import { mutation } from "./_generated/server";
import * as Effect from "effect/Effect";
import { forbidden, conflict } from "./domain/result";
import { requireAuth, requireEntity, toDomainResultAsync } from "./domain/effect";
import { getFieldDefinitions } from "./lib/typed";
import { getDefaultFieldLayout } from "../src/lib/types";
import { enrollExistingCardsForUser } from "./lib/srsEnrollment";

export const addToLibrary = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
      if (set.visibility === "private") {
        return yield* Effect.fail(forbidden("Cannot add a private set to your library."));
      }
      const existing = yield* Effect.promise(() =>
        ctx.db.query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId),
          )
          .first(),
      );
      if (existing) {
        return yield* Effect.fail(conflict("Set already in library"));
      }
      const fieldDefs = getFieldDefinitions(set);
      const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(fieldDefs);
      const userSetId = yield* Effect.promise(() =>
        ctx.db.insert("userSets", {
          userId: identity.tokenIdentifier,
          setId: args.setId,
          role: "member",
          srsEnabled: true,
          defaultFrontFields,
          defaultBackFields,
          defaultTtsOnlyFields: [],
          createdAt: Date.now(),
        }),
      );
      yield* Effect.promise(() =>
        enrollExistingCardsForUser(ctx, {
          userId: identity.tokenIdentifier,
          setId: args.setId,
          srsEnabled: true,
        }),
      );
      return userSetId;
    }),
  ),
});
