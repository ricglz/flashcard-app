import * as Effect from "effect/Effect";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { notFound, type CommonFailure } from "./result";

export type ValidatedSrsReviewAction =
  | {
      kind: "record";
      srsCard: Doc<"srsCards">;
      queueItem: Doc<"reviewQueue">;
    }
  | {
      kind: "duplicate";
      remaining: number;
    };

export function validateSrsReviewAction(
  ctx: MutationCtx,
  {
    userId,
    srsCardId,
  }: {
    userId: string;
    srsCardId: Id<"srsCards">;
  },
): Effect.Effect<ValidatedSrsReviewAction, CommonFailure> {
  return Effect.gen(function* () {
    const srsCard = yield* Effect.promise(() => ctx.db.get(srsCardId));
    if (!srsCard || srsCard.userId !== userId) {
      return yield* Effect.fail(notFound("SRS card not found"));
    }

    const queueItem = yield* Effect.promise(() =>
      ctx.db
        .query("reviewQueue")
        .withIndex("by_srsCardId_and_userId", (q) =>
          q.eq("srsCardId", srsCardId).eq("userId", userId),
        )
        .first(),
    );

    if (!queueItem) {
      const queueItems = yield* Effect.promise(() =>
        ctx.db
          .query("reviewQueue")
          .withIndex("by_srsCardId", (q) => q.eq("srsCardId", srsCardId))
          .take(10),
      );
      if (queueItems.length > 0) {
        return yield* Effect.fail(notFound("Review queue item not found"));
      }
      const remaining = yield* Effect.promise(() =>
        ctx.db
          .query("reviewQueue")
          .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
          .take(500),
      );
      return { kind: "duplicate", remaining: remaining.length };
    }

    if (
      queueItem.cardId !== srsCard.cardId ||
      queueItem.setId !== srsCard.setId
    ) {
      return yield* Effect.fail(notFound("Review queue item not found"));
    }

    return { kind: "record", srsCard, queueItem };
  });
}
