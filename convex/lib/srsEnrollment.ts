import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertDefaultSrsCard } from "../srs";

const MAX_SRS_ENROLLMENT_CARDS_PER_SET = 1000;

export async function ensureSrsCardForCard(
  ctx: MutationCtx,
  {
    userId,
    cardId,
    setId,
  }: {
    userId: string;
    cardId: Id<"flashcards">;
    setId: Id<"flashcardSets">;
  },
) {
  const existing = await ctx.db
    .query("srsCards")
    .withIndex("by_cardId_and_userId", (q) => q.eq("cardId", cardId).eq("userId", userId))
    .first();
  if (existing) return existing._id;
  return await insertDefaultSrsCard(ctx, { userId, cardId, setId });
}

export async function enrollExistingCardsForUser(
  ctx: MutationCtx,
  userSet: Pick<Doc<"userSets">, "userId" | "setId" | "srsEnabled">,
) {
  if (!userSet.srsEnabled) return;

  const cards = await ctx.db
    .query("flashcards")
    .withIndex("by_setId", (q) => q.eq("setId", userSet.setId))
    .take(MAX_SRS_ENROLLMENT_CARDS_PER_SET);

  const existingSrsCards = await ctx.db
    .query("srsCards")
    .withIndex("by_userId_and_setId", (q) =>
      q.eq("userId", userSet.userId).eq("setId", userSet.setId)
    )
    .take(MAX_SRS_ENROLLMENT_CARDS_PER_SET);
  const existingCardIds = new Set(existingSrsCards.map((sc) => sc.cardId));

  for (const card of cards) {
    if (!existingCardIds.has(card._id)) {
      await ensureSrsCardForCard(ctx, {
        userId: userSet.userId,
        cardId: card._id,
        setId: userSet.setId,
      });
    }
  }
}

export async function enrollCardsForEnabledSetUsers(
  ctx: MutationCtx,
  {
    setId,
    cardIds,
  }: {
    setId: Id<"flashcardSets">;
    cardIds: readonly Id<"flashcards">[];
  },
) {
  const links = await ctx.db
    .query("userSets")
    .withIndex("by_setId", (q) => q.eq("setId", setId))
    .take(500);

  for (const link of links) {
    if (link.srsEnabled) {
      for (const cardId of cardIds) {
        await ensureSrsCardForCard(ctx, {
          userId: link.userId,
          setId,
          cardId,
        });
      }
    }
  }
}
