import { v } from "convex/values";
import { mutation } from "./_generated/server";
import * as Effect from "effect/Effect";
import type { Doc, Id } from "./_generated/dataModel";
import {
  conflict,
  forbidden,
  invalidInput,
  type CommonFailure,
  type DomainResult,
} from "./domain/result";
import {
  fromDomainResult,
  requireAuth,
  requireEntity,
  toDomainResultAsync,
} from "./domain/effect";
import type { FieldDefinition } from "../src/lib/types";
import type { TokenAnnotations } from "../src/lib/types";
import { getFieldDefinitions } from "./lib/typed";
import { getDefaultFieldLayout } from "../src/lib/types";
import { createInitialCardsForSetWithOrigins, MAX_CARDS_PER_SET } from "./lib/cardCreation";
import { internal } from "./_generated/api";
import type { TokenAnnotationValidationFailure } from "./domain/tokenAnnotations";

type MergeResult = {
  setId: Id<"flashcardSets">;
  skippedDuplicateCount: number;
};

function hasStructuralFieldDefinitionChange(
  current: readonly FieldDefinition[],
  next: readonly FieldDefinition[],
) {
  if (current.length !== next.length) return true;
  const currentNames = new Set(current.map((field) => field.name));
  return next.some((field) => !currentNames.has(field.name));
}

export const merge = mutation({
  args: {
    sourceSetIds: v.array(v.id("flashcardSets")),
    archiveSource: v.boolean(),
  },
  handler: (
    ctx,
    args,
  ): Promise<DomainResult<MergeResult, CommonFailure | TokenAnnotationValidationFailure>> => toDomainResultAsync(
    Effect.gen(function* () {
      const identity = yield* requireAuth(ctx);
      const tokenIdentifier = identity.tokenIdentifier;

      const uniqueIds = Array.from(new Set(args.sourceSetIds as string[])) as Id<"flashcardSets">[];
      if (uniqueIds.length < 2 || uniqueIds.length > 5) {
        return yield* Effect.fail(invalidInput("Select between 2 and 5 sets to merge."));
      }
      if (uniqueIds.length !== args.sourceSetIds.length) {
        return yield* Effect.fail(invalidInput("Duplicate set IDs are not allowed."));
      }

      const sources: { set: Doc<"flashcardSets">; link: Doc<"userSets"> }[] = [];
      for (const setId of uniqueIds) {
        const set = yield* requireEntity(ctx.db.get(setId), "Source set not found");
        if (set.archivedAt !== undefined) {
          return yield* Effect.fail(invalidInput(`Set "${set.name}" is archived and cannot be merged.`));
        }
        const link = yield* Effect.promise(() => ctx.db.query("userSets").withIndex("by_userId_and_setId", q => q.eq("userId", tokenIdentifier).eq("setId", setId)).first());
        if (!link) {
          return yield* Effect.fail(forbidden(`You do not have access to set "${set.name}".`));
        }
        sources.push({ set, link });
      }

      const firstSource = sources[0];
      if (!firstSource) {
        return yield* Effect.fail(invalidInput("No source sets provided."));
      }
      const firstFields = getFieldDefinitions(firstSource.set);
      for (let i = 1; i < sources.length; i++) {
        const source = sources[i];
        if (!source) {
          return yield* Effect.fail(invalidInput("Invalid source set index."));
        }
        const otherFields = getFieldDefinitions(source.set);
        const mismatch = hasStructuralFieldDefinitionChange(firstFields, otherFields) ||
          firstFields.length !== otherFields.length ||
          firstFields.some((f, idx) => {
            const o = otherFields[idx];
            return !o || f.name !== o.name || f.role !== o.role || f.order !== o.order || JSON.stringify(f.metadata) !== JSON.stringify(o.metadata);
          });
        if (mismatch) {
          const names = sources.map(s => s.set.name).join(", ");
          return yield* Effect.fail(invalidInput(`Field schemas do not match across selected sets: ${names}`));
        }
      }

      if (args.archiveSource) {
        const nonOwned = sources.filter(s => s.link.role !== "owner").map(s => s.set.name);
        if (nonOwned.length > 0) {
          return yield* Effect.fail(forbidden(`Archive requested but you are not owner of: ${nonOwned.join(", ")}`));
        }
      }

      type CardWithSource = {
        fields: Record<string,string>;
        tokenAnnotations?: TokenAnnotations;
        order: number;
        sourceSetId: Id<"flashcardSets">;
      };
      const dedupMap = new Map<string, CardWithSource>();
      let skippedDuplicateCount = 0;

      for (let srcIdx = 0; srcIdx < sources.length; srcIdx++) {
        const sourceEntry = sources[srcIdx];
        if (!sourceEntry) {
          return yield* Effect.fail(invalidInput("Invalid source set index."));
        }
        const { set } = sourceEntry;
        const active = yield* Effect.promise(async () => {
          const activeCards: Doc<"flashcards">[] = [];
          let cursor: string | null = null;
          while (activeCards.length < MAX_CARDS_PER_SET) {
            const page = await ctx.db
              .query("flashcards")
              .withIndex("by_setId", (q) => q.eq("setId", set._id))
              .paginate({ cursor, numItems: 100 });
            for (const card of page.page) {
              if (card.archivedAt === undefined) {
                activeCards.push(card);
                if (activeCards.length >= MAX_CARDS_PER_SET) break;
              }
            }
            if (page.isDone) break;
            cursor = page.continueCursor;
          }
          activeCards.sort((a, b) => a.order - b.order);
          return activeCards;
        });
        for (const card of active) {
          const key = JSON.stringify(Object.keys(card.fields).sort().map(k => [k, card.fields[k]]));
          if (!dedupMap.has(key)) {
            dedupMap.set(key, {
              fields: card.fields,
              tokenAnnotations: card.tokenAnnotations,
              order: card.order,
              sourceSetId: set._id,
            });
          } else {
            skippedDuplicateCount++;
          }
        }
      }

      const uniqueCards = Array.from(dedupMap.values());
      if (uniqueCards.length === 0) {
        return yield* Effect.fail(invalidInput("Merge would result in empty set."));
      }
      if (uniqueCards.length > MAX_CARDS_PER_SET) {
        return yield* Effect.fail(conflict(`Merge exceeds limit of ${MAX_CARDS_PER_SET} cards (got ${uniqueCards.length}).`));
      }

      const now = Date.now();
      const sourceNames = sources.map(s => s.set.name).join(", ");
      const newSetId = yield* Effect.promise(() => ctx.db.insert("flashcardSets", {
        name: `Merged set ${new Date().toISOString().slice(0,10)}`,
        description: `Merged from: ${sourceNames}`,
        ownerId: tokenIdentifier,
        fieldDefinitions: firstFields,
        origin: { kind: "merged", sourceSetIds: uniqueIds, mergedAt: now },
        visibility: "private",
        cardCount: uniqueCards.length,
        updatedAt: now,
        createdAt: now,
      }));

      const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(firstFields);
      yield* Effect.promise(() => ctx.db.insert("userSets", {
        userId: tokenIdentifier,
        setId: newSetId,
        role: "owner",
        srsEnabled: true,
        defaultFrontFields,
        defaultBackFields,
        defaultTtsOnlyFields: [],
        createdAt: now,
      }));

      const cardsWithOrigin = uniqueCards.map((c, idx) => ({
        fields: c.fields,
        tokenAnnotations: c.tokenAnnotations ?? {},
        order: idx,
        origin: { kind: "merged" as const, sourceSetId: c.sourceSetId },
      }));

      const firstUniqueId = uniqueIds[0];
      if (!firstUniqueId) {
        return yield* Effect.fail(invalidInput("No source sets provided."));
      }

      yield* fromDomainResult(
        yield* Effect.promise(() => createInitialCardsForSetWithOrigins(ctx, {
          set: { _id: newSetId, cardCount: uniqueCards.length, fieldDefinitions: firstFields, updatedAt: now },
          cards: cardsWithOrigin,
          defaultOrigin: { kind: "merged", sourceSetId: firstUniqueId },
          srsEnrollment: { kind: "specificUser", userId: tokenIdentifier },
        })),
      );

      if (args.archiveSource) {
        for (const { set } of sources) {
          yield* Effect.promise(() => ctx.db.patch(set._id, { archivedAt: now, visibility: "private" }));
          yield* Effect.promise(() =>
            ctx.scheduler.runAfter(0, internal.internalCleanup.cleanupArchivedSetQueues, {
              setId: set._id,
              cursor: null,
            })
          );
        }
      }

      return { setId: newSetId, skippedDuplicateCount };
    }),
  ),
});
