import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import { userSetRoleValidator } from "./schema";
import { fail, ok, unauthenticated, notFound, forbidden, conflict, type CommonFailure } from "./domain/result";
import {
  fromAsyncDomainResult,
  requireAuth,
  requireEntity,
  toDomainResultAsync,
} from "./domain/effect";
import { validateStudySessionSetupEffect } from "./domain/studySessionSetup";
import { getFieldDefinitions } from "./lib/typed";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";
import {
  enrollExistingCardsForUser,
} from "./lib/srsEnrollment";

export async function assertMember(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">
) {
  const link = await ctx.db
    .query("userSets")
    .withIndex("by_userId_and_setId", (q) =>
      q.eq("userId", userId).eq("setId", setId)
    )
    .first();
  if (!link) return fail(notFound("Set not found"));
  return ok(link);
}

export async function assertOwner(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">
) {
  const link = await assertMember(ctx, userId, setId);
  if (!link.ok) return link;
  if (link.value.role !== "owner") return fail(forbidden("Only the set owner can do that."));
  return ok(link.value);
}

export function assertMemberEffect(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return fromAsyncDomainResult(assertMember(ctx, userId, setId));
}

export function assertOwnerEffect(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  return fromAsyncDomainResult(assertOwner(ctx, userId, setId));
}

export type SetContentAccess = {
  identity: UserIdentity;
  set: Doc<"flashcardSets">;
  userSet: Doc<"userSets"> | null;
  role: "owner" | "member" | "visitor";
};

export function requireSetContentAccessEffect(
  ctx: QueryCtx | MutationCtx,
  setId: Id<"flashcardSets">,
): Effect.Effect<SetContentAccess, CommonFailure> {
  return Effect.gen(function* () {
    const identity = yield* requireAuth(ctx);
    const set = yield* requireEntity(ctx.db.get(setId), "Set not found");
    const link = yield* Effect.promise(() =>
      ctx.db
        .query("userSets")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", identity.tokenIdentifier).eq("setId", setId),
        )
        .first(),
    );

    if (link) {
      return { identity, set, userSet: link, role: link.role };
    }

    if (set.visibility === "private") {
      return yield* Effect.fail(forbidden("You do not have access to this set."));
    }

    return { identity, set, userSet: null, role: "visitor" as const };
  });
}

async function deleteReviewQueueRowsForUserSet(
  ctx: MutationCtx,
  userId: string,
  setId: Id<"flashcardSets">,
) {
  for await (
    const item of ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
  ) {
    if (item.setId === setId) await ctx.db.delete(item._id);
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const links = await ctx.db
      .query("userSets")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(100);
    const sets = await Promise.all(
      links.map(async (link) => {
        const set = await ctx.db.get(link.setId);
        if (!set) return null;
        return { ...set, userSet: link };
      })
    );
    return ok(sets.filter((s) => s !== null));
  },
});

export const get = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (!link) return fail(notFound("Set not found"));
    return ok(link);
  },
});

export const add = mutation({
  args: {
    setId: v.id("flashcardSets"),
    role: userSetRoleValidator,
    srsEnabled: v.optional(v.boolean()),
    defaultFrontFields: v.array(v.string()),
    defaultBackFields: v.array(v.string()),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* requireEntity(ctx.db.get(args.setId), "Set not found");

      const existing = yield* Effect.promise(() =>
        ctx.db.query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId),
          )
          .first(),
      );
      if (existing) return yield* Effect.fail(conflict("Set already in library"));

      const srsEnabled = args.srsEnabled ?? true;
      const userSetId = yield* Effect.promise(() =>
        ctx.db.insert("userSets", {
          userId: identity.tokenIdentifier,
          setId: args.setId,
          role: args.role,
          srsEnabled,
          defaultFrontFields: args.defaultFrontFields,
          defaultBackFields: args.defaultBackFields,
          defaultTtsOnlyFields: [],
          createdAt: Date.now(),
        }),
      );

      if (srsEnabled) {
        yield* Effect.promise(() =>
          enrollExistingCardsForUser(ctx, {
            userId: identity.tokenIdentifier,
            setId: args.setId,
            srsEnabled,
          }),
        );
      }

      return userSetId;
    }),
  ),
});

export const updateStudyDefaults = mutation({
  args: {
    setId: v.id("flashcardSets"),
    defaultFrontFields: v.array(v.string()),
    defaultBackFields: v.array(v.string()),
    defaultTtsOnlyFields: v.array(v.string()),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const link = yield* requireEntity(
        ctx.db.query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId),
          )
          .first(),
        "Set not found",
      );
      const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");

      yield* validateStudySessionSetupEffect({
        fieldDefinitions: getFieldDefinitions(set),
        frontFields: args.defaultFrontFields,
        backFields: args.defaultBackFields,
        ttsOnlyFields: args.defaultTtsOnlyFields,
      });

      yield* Effect.promise(() =>
        ctx.db.patch(link._id, {
          defaultFrontFields: args.defaultFrontFields,
          defaultBackFields: args.defaultBackFields,
          defaultTtsOnlyFields: args.defaultTtsOnlyFields,
        }),
      );

      return null;
    }),
  ),
});

export const enableSrs = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* requireEntity(ctx.db.get(args.setId), "Set not found");
      const link = yield* requireEntity(
        ctx.db.query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId),
          )
          .first(),
        "Set not found",
      );

      if (!link.srsEnabled) {
        yield* Effect.promise(() => ctx.db.patch(link._id, { srsEnabled: true }));
        yield* Effect.promise(() =>
          enrollExistingCardsForUser(ctx, { ...link, srsEnabled: true }),
        );
      }
      return null;
    }),
  ),
});

export const disableSrs = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const link = yield* requireEntity(
        ctx.db.query("userSets")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId),
          )
          .first(),
        "Set not found",
      );

      if (link.srsEnabled) {
        yield* Effect.promise(() => ctx.db.patch(link._id, { srsEnabled: false }));
        yield* Effect.promise(() =>
          deleteReviewQueueRowsForUserSet(ctx, identity.tokenIdentifier, args.setId),
        );
      }
      return null;
    }),
  ),
});

export const remove = mutation({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());

    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      )
      .first();
    if (!link) return fail(notFound("Set not found"));

    await deleteAllMatching(ctx,
      () => ctx.db.query("srsCards").withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("setId", args.setId)
      ).take(DELETION_BATCH_SIZE),
      async (ctx, srsCard) => {
        await deleteAllMatching(ctx,
          () => ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id)).take(DELETION_BATCH_SIZE),
        );
      },
    );

    await ctx.db.delete(link._id);
    return ok(null);
  },
});

export const enrollCardsForSet = internalMutation({
  args: {
    userId: v.string(),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const userSet = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", args.userId).eq("setId", args.setId)
      )
      .first();
    if (userSet) await enrollExistingCardsForUser(ctx, userSet);
  },
});
