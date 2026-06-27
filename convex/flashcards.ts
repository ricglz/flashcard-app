import { v, type ObjectType } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Effect from "effect/Effect";
import { assertOwnerEffect, requireSetContentAccessEffect } from "./userSets";
import { validateCardFieldsEffect, type CardFieldsValidationFailure } from "./domain/cardFields";
import { invalidInput, type CommonFailure } from "./domain/result";
import { fromDomainResult, requireAuth, requireEntity, toDomainResultAsync } from "./domain/effect";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { deleteAllMatching, DELETION_BATCH_SIZE } from "./lib/batch";
import {
  dropAnnotationsForChangedFields,
  mergeTokenAnnotations,
  validateTokenAnnotationsForCardEffect,
  type TokenAnnotationValidationFailure,
} from "./domain/tokenAnnotations";
import {
  appendCardsToSet,
  MAX_CARDS_PER_SET,
  validateCardBatchSize,
} from "./lib/cardCreation";
import { tokenAnnotationValidator } from "./schema";

const updateArgsValidator = {
  id: v.id("flashcards"),
  fields: v.optional(v.record(v.string(), v.string())),
  tokenAnnotations: v.optional(v.record(v.string(), v.array(tokenAnnotationValidator))),
  order: v.optional(v.number()),
};

type FlashcardUpdatePatch = Partial<Omit<ObjectType<typeof updateArgsValidator>, "id">>;

function validateAgainstSetEffect(
  set: { fieldDefinitions: Array<{ name: string }> },
  fields: Record<string, string>,
) {
  return validateCardFieldsEffect(
    set.fieldDefinitions.map((field) => field.name),
    fields,
  );
}

async function getActiveCardsForSet(
  ctx: QueryCtx,
  setId: Doc<"flashcards">["setId"],
) {
  const activeCards: Doc<"flashcards">[] = [];
  for await (
    const card of ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", setId))
  ) {
    if (card.archivedAt === undefined) activeCards.push(card);
    if (activeCards.length >= MAX_CARDS_PER_SET) break;
  }
  return activeCards;
}

export const list = query({
  args: { setId: v.id("flashcardSets") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      yield* requireSetContentAccessEffect(ctx, args.setId);
      return yield* Effect.promise(() => getActiveCardsForSet(ctx, args.setId));
    }),
  ),
});

export const create = mutation({
  args: {
    setId: v.id("flashcardSets"),
    fields: v.record(v.string(), v.string()),
    tokenAnnotations: v.optional(v.record(v.string(), v.array(tokenAnnotationValidator))),
    order: v.number(),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.setId);
      const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
      const result = yield* fromDomainResult(
        yield* Effect.promise(() =>
          appendCardsToSet(ctx, {
            set,
            cards: [{
              fields: args.fields,
              tokenAnnotations: args.tokenAnnotations ?? {},
              order: args.order,
            }],
            origin: { kind: "manual" },
            srsEnrollment: { kind: "enabledUsersForSet" },
          }),
        ),
      );
      const id = result.cardIds[0];
      if (id === undefined) return yield* Effect.fail(invalidInput("No card was created."));
      return id;
    }),
  ),
});

export const batchCreate = mutation({
  args: {
    setId: v.id("flashcardSets"),
    cards: v.array(
      v.object({
        fields: v.record(v.string(), v.string()),
        tokenAnnotations: v.optional(v.record(v.string(), v.array(tokenAnnotationValidator))),
        order: v.number(),
      }),
    ),
  },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, args.setId);
      const set = yield* requireEntity(ctx.db.get(args.setId), "Set not found");
      yield* fromDomainResult(validateCardBatchSize(args.cards.length));
      const result = yield* fromDomainResult(
        yield* Effect.promise(() =>
          appendCardsToSet(ctx, {
            set,
            cards: args.cards.map((card) => ({
              fields: card.fields,
              tokenAnnotations: card.tokenAnnotations ?? {},
              order: card.order,
            })),
            origin: { kind: "manual" },
            srsEnrollment: { kind: "enabledUsersForSet" },
          }),
        ),
      );
      return result.cardIds;
    }),
  ),
});

export const update = mutation({
  args: updateArgsValidator,
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const card = yield* requireEntity(ctx.db.get(args.id), "Card not found");
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, card.setId);
      const patch: FlashcardUpdatePatch = {};
      let nextFields = card.fields;
      const set = args.fields !== undefined || args.tokenAnnotations !== undefined
        ? yield* requireEntity(ctx.db.get(card.setId), "Set not found")
        : null;
      const validFieldNames = set?.fieldDefinitions.map((field) => field.name) ?? [];

      if (args.fields !== undefined) {
        if (set === null) return yield* Effect.fail(invalidInput("Set not found."));
        patch.fields = yield* validateAgainstSetEffect(set, args.fields);
        nextFields = patch.fields;
      }

      if (args.tokenAnnotations !== undefined) {
        const validated = yield* validateTokenAnnotationsForCardEffect({
          validFieldNames,
          fields: nextFields,
          tokenAnnotations: args.tokenAnnotations,
        });
        const existingAnnotations = args.fields === undefined
          ? card.tokenAnnotations
          : dropAnnotationsForChangedFields(
            card.fields,
            nextFields,
            card.tokenAnnotations,
          ).tokenAnnotations;
        patch.tokenAnnotations = mergeTokenAnnotations(existingAnnotations, validated) ?? undefined;
      } else if (args.fields !== undefined) {
        const dropped = dropAnnotationsForChangedFields(
          card.fields,
          nextFields,
          card.tokenAnnotations,
        );
        if (dropped.droppedFieldNames.length > 0) {
          console.warn("[flashcards] Dropped token annotations after field text change", {
            cardId: args.id,
            fieldNames: dropped.droppedFieldNames,
          });
        }
        patch.tokenAnnotations = dropped.tokenAnnotations;
      }
      if (args.order !== undefined) patch.order = args.order;
      yield* Effect.promise(() => ctx.db.patch(args.id, patch));
      yield* Effect.promise(() => ctx.db.patch(card.setId, { updatedAt: Date.now() }));
      return null;
    }),
  ),
});

export const remove = mutation({
  args: { id: v.id("flashcards") },
  handler: (ctx, args) => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const card = yield* requireEntity(ctx.db.get(args.id), "Card not found");
      yield* assertOwnerEffect(ctx, identity.tokenIdentifier, card.setId);
      const set = yield* Effect.promise(() => ctx.db.get(card.setId));
      if (card.archivedAt !== undefined) return null;
      const archivedAt = Date.now();

      yield* Effect.promise(() =>
        deleteAllMatching(
          ctx,
          () => ctx.db.query("srsCards").withIndex("by_cardId", (q) => q.eq("cardId", args.id)).take(DELETION_BATCH_SIZE),
          async (ctx, srsCard) => {
            await deleteAllMatching(
              ctx,
              () => ctx.db.query("reviewQueue").withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCard._id)).take(DELETION_BATCH_SIZE),
            );
          },
        ),
      );

      yield* Effect.promise(() =>
        deleteAllMatching(
          ctx,
          () => ctx.db.query("cardAnnotations").withIndex("by_cardId", (q) => q.eq("cardId", args.id)).take(DELETION_BATCH_SIZE),
        ),
      );

      yield* Effect.promise(async () => {
        for await (
          const session of ctx.db
            .query("studySessions")
            .withIndex("by_setId_and_userId", (q) => q.eq("setId", card.setId))
        ) {
          if (session.status === "in_progress" && session.cardOrder.includes(args.id)) {
            await ctx.db.patch(session._id, {
              status: "abandoned" as const,
              completedAt: archivedAt,
            });
          }
        }
      });

      yield* Effect.promise(() => ctx.db.patch(args.id, { archivedAt }));
      if (set) {
        yield* Effect.promise(() =>
          ctx.db.patch(set._id, {
            cardCount: Math.max(0, set.cardCount - 1),
            updatedAt: Date.now(),
          }),
        );
      }
      return null;
    }),
  ),
});

export type FlashcardMutationFailure =
  | CommonFailure
  | CardFieldsValidationFailure
  | TokenAnnotationValidationFailure;
export type FlashcardListFailure = CommonFailure;
