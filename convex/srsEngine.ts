import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { SRS_DEFAULTS, selectNewCardsRoundRobin } from "./srs";

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

    const userSetLinks = await ctx.db
      .query("userSets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const srsSetIds = userSetLinks
      .filter((us) => us.srsEnabled)
      .map((us) => us.setId);

    if (srsSetIds.length === 0) return;

    // Ensure all flashcards have srsCards rows
    for (const setId of srsSetIds) {
      const cards = await ctx.db
        .query("flashcards")
        .withIndex("by_setId", (q) => q.eq("setId", setId))
        .take(1000);

      for (const card of cards) {
        const existing = await ctx.db
          .query("srsCards")
          .withIndex("by_cardId_and_userId", (q) =>
            q.eq("cardId", card._id).eq("userId", userId)
          )
          .first();
        if (!existing) {
          await ctx.db.insert("srsCards", {
            userId,
            cardId: card._id,
            setId,
            easeFactor: SRS_DEFAULTS.INITIAL_EASE_FACTOR,
            interval: SRS_DEFAULTS.INITIAL_INTERVAL,
            repetitions: SRS_DEFAULTS.INITIAL_REPETITIONS,
            nextReviewAt: 0,
            status: "new",
          });
        }
      }
    }

    // Get srsCardIds already in the queue to avoid duplicates
    const existingQueue = await ctx.db
      .query("reviewQueue")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
      .take(500);

    const alreadyQueued = new Set(existingQueue.map((q) => q.srsCardId));

    // Find max order in existing queue for appending
    let maxOrder = 0;
    for (const q of existingQueue) {
      if (q.order > maxOrder) maxOrder = q.order;
    }
    if (existingQueue.length > 0) maxOrder += 1;

    // Collect due cards (review + learning cards past their review date)
    const dueCards = await ctx.db
      .query("srsCards")
      .withIndex("by_userId_and_nextReviewAt", (q) =>
        q.eq("userId", userId).lte("nextReviewAt", now)
      )
      .take(500);

    const dueSrsCards = dueCards.filter(
      (sc) => sc.status !== "new" && !alreadyQueued.has(sc._id)
    );

    // Read global new-cards-per-day limit from userSettings
    const userSettingsRow = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const globalLimit = userSettingsRow?.maxNewCardsPerDay ?? SRS_DEFAULTS.MAX_NEW_CARDS_PER_DAY;

    // Count total new cards already in the queue across all sets
    let totalQueuedNew = 0;
    for (const qi of existingQueue) {
      const sc = await ctx.db.get(qi.srsCardId);
      if (sc && sc.status === "new") totalQueuedNew++;
    }
    const globalRemaining = globalLimit - totalQueuedNew;

    // Collect new cards round-robin across sets, capped at globalRemaining
    const newCards: typeof dueCards = [];

    if (globalRemaining > 0) {
      const perSetAvailable: (typeof dueCards)[] = [];

      for (const setId of srsSetIds) {
        const srsCardsForSet = await ctx.db
          .query("srsCards")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", userId).eq("setId", setId)
          )
          .take(500);

        const available = srsCardsForSet.filter(
          (sc) => sc.status === "new" && !alreadyQueued.has(sc._id)
        );

        if (available.length > 0) {
          perSetAvailable.push(available);
        }
      }

      newCards.push(...selectNewCardsRoundRobin(perSetAvailable, globalRemaining));
    }

    // Combine and shuffle (Fisher-Yates)
    const toQueue = [...dueSrsCards, ...newCards];
    for (let i = toQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [toQueue[i], toQueue[j]] = [toQueue[j], toQueue[i]];
    }

    // Insert into reviewQueue
    for (let i = 0; i < toQueue.length; i++) {
      const sc = toQueue[i];
      await ctx.db.insert("reviewQueue", {
        userId,
        cardId: sc.cardId,
        srsCardId: sc._id,
        setId: sc.setId,
        queuedAt: now,
        order: maxOrder + i,
      });
    }
  },
});
