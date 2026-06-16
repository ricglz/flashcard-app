import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { SRS_DEFAULTS, insertDefaultSrsCard, selectNewCardsRoundRobin } from "./srs";
import { shuffleArray } from "../src/lib/shuffle";
import type { Id } from "./_generated/dataModel";

export async function populateQueue(
  ctx: MutationCtx,
  userId: string,
  newCardLimit: number
): Promise<number> {
  const now = Date.now();

  const srsSetIds: Id<"flashcardSets">[] = [];
  let cursor: string | null = null;
  while (srsSetIds.length < 100) {
    const page = await ctx.db
      .query("userSets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .paginate({ cursor, numItems: 100 });
    for (const us of page.page) {
      if (!us.srsEnabled) continue;
      const set = await ctx.db.get(us.setId);
      if (set && set.archivedAt === undefined) {
        srsSetIds.push(us.setId);
        if (srsSetIds.length >= 100) break;
      }
    }
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  const enabledSetIds = new Set(srsSetIds);

  if (srsSetIds.length === 0) return 0;

  for (const setId of srsSetIds) {
    const [cards, existingSrsCards] = await Promise.all([
      ctx.db
        .query("flashcards")
        .withIndex("by_setId", (q) => q.eq("setId", setId))
        .take(1000),
      ctx.db
        .query("srsCards")
        .withIndex("by_userId_and_setId", (q) =>
          q.eq("userId", userId).eq("setId", setId)
        )
        .take(1000),
    ]);

    const enrolledCardIds = new Set(existingSrsCards.map((sc) => sc.cardId));

    for (const card of cards) {
      if (!enrolledCardIds.has(card._id)) {
        await insertDefaultSrsCard(ctx, {
          userId,
          cardId: card._id,
          setId,
        });
      }
    }
  }

  const existingQueue = await ctx.db
    .query("reviewQueue")
    .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
    .take(500);

  const alreadyQueued = new Set(existingQueue.map((q) => q.srsCardId));

  let maxOrder = 0;
  for (const q of existingQueue) {
    if (q.order > maxOrder) maxOrder = q.order;
  }
  if (existingQueue.length > 0) maxOrder += 1;

  const dueCards = await ctx.db
    .query("srsCards")
    .withIndex("by_userId_and_nextReviewAt", (q) =>
      q.eq("userId", userId).lte("nextReviewAt", now)
    )
    .take(500);

  const dueSrsCards = dueCards.filter(
    (sc) =>
      sc.status !== "new" &&
      enabledSetIds.has(sc.setId) &&
      !alreadyQueued.has(sc._id)
  );

  const newCards: typeof dueCards = [];
  if (newCardLimit > 0) {
    const srsCardsBySet = await Promise.all(
      srsSetIds.map((setId) =>
        ctx.db
          .query("srsCards")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", userId).eq("setId", setId)
          )
          .take(500)
      )
    );

    const perSetAvailable: (typeof dueCards)[] = [];
    for (const srsCardsForSet of srsCardsBySet) {
      const available = srsCardsForSet.filter(
        (sc) => sc.status === "new" && !alreadyQueued.has(sc._id)
      );

      if (available.length > 0) {
        perSetAvailable.push(available);
      }
    }

    newCards.push(
      ...selectNewCardsRoundRobin(perSetAvailable, newCardLimit)
    );
  }

  const toQueue = shuffleArray([...dueSrsCards, ...newCards]);

  for (const [i, sc] of toQueue.entries()) {
    await ctx.db.insert("reviewQueue", {
      userId,
      cardId: sc.cardId,
      srsCardId: sc._id,
      setId: sc.setId,
      queuedAt: now,
      order: maxOrder + i,
    });
  }

  return toQueue.length;
}

export const populateQueues = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUserSets = await ctx.db.query("userSets").take(500);

    const userIds = new Set<string>();
    for (const us of allUserSets) {
      if (us.srsEnabled) {
        userIds.add(us.userId);
      }
    }

    for (const userId of userIds) {
      await ctx.scheduler.runAfter(
        0,
        internal.srsEngine.populateQueueForUser,
        { userId }
      );
    }
  },
});

export const populateQueueForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    const now = Date.now();

    const userSettingsRow = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const dayResetUtcHour =
      userSettingsRow?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
    const currentUtcHour = new Date(now).getUTCHours();
    const isResetHour = currentUtcHour === dayResetUtcHour;

    let newCardLimit = 0;
    if (isResetHour) {
      const globalLimit =
        userSettingsRow?.maxNewCardsPerDay ??
        SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY;

      const existingQueue = await ctx.db
        .query("reviewQueue")
        .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
        .take(500);

      let totalQueuedNew = 0;
      const queuedSrsCardIds = existingQueue.map((qi) => qi.srsCardId);
      if (queuedSrsCardIds.length > 0) {
        const allUserSrsCards = await ctx.db
          .query("srsCards")
          .withIndex("by_userId_and_nextReviewAt", (q) =>
            q.eq("userId", userId)
          )
          .take(2000);
        const srsCardMap = new Map(allUserSrsCards.map((sc) => [sc._id, sc]));
        for (const srsCardId of queuedSrsCardIds) {
          const sc = srsCardMap.get(srsCardId);
          if (sc && sc.status === "new") totalQueuedNew++;
        }
      }
      newCardLimit = Math.max(0, globalLimit - totalQueuedNew);
    }

    await populateQueue(ctx, userId, newCardLimit);
  },
});
