import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { computeDayStartMs, computeDayKey, SRS_DEFAULTS } from "./srs";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function incrementDailyStats(
  ctx: MutationCtx,
  userId: string,
  source: "srs" | "session",
  ratingScore: number
) {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  const dayResetUtcHour =
    settings?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
  const dayStartMs = computeDayStartMs(dayResetUtcHour);
  const dayKey = computeDayKey(dayResetUtcHour);

  const existing = await ctx.db
    .query("dailyStats")
    .withIndex("by_userId_and_dayKey", (q) =>
      q.eq("userId", userId).eq("dayKey", dayKey)
    )
    .first();

  const isCorrect = ratingScore >= 2;

  if (existing) {
    await ctx.db.patch(existing._id, {
      srsReviewCount:
        existing.srsReviewCount + (source === "srs" ? 1 : 0),
      sessionCardCount:
        existing.sessionCardCount + (source === "session" ? 1 : 0),
      correctCount: existing.correctCount + (isCorrect ? 1 : 0),
      totalRatingScore: existing.totalRatingScore + ratingScore,
    });
  } else {
    await ctx.db.insert("dailyStats", {
      userId,
      dayKey,
      dayStartMs,
      srsReviewCount: source === "srs" ? 1 : 0,
      sessionCardCount: source === "session" ? 1 : 0,
      correctCount: isCorrect ? 1 : 0,
      totalRatingScore: ratingScore,
    });
  }
}

export const getStreakStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .first();
    const dayResetUtcHour =
      settings?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
    const todayMs = computeDayStartMs(dayResetUtcHour);

    const rows = await ctx.db
      .query("dailyStats")
      .withIndex("by_userId_and_dayStartMs", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(365);

    if (rows.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let expectedMs = todayMs;

    for (const row of rows) {
      const totalCards =
        row.srsReviewCount + row.sessionCardCount;
      if (row.dayStartMs === expectedMs) {
        if (totalCards > 0) {
          currentStreak++;
          expectedMs -= MS_PER_DAY;
        } else {
          break;
        }
      } else if (
        row.dayStartMs === expectedMs - MS_PER_DAY &&
        expectedMs === todayMs
      ) {
        // Today has no activity yet — check yesterday
        expectedMs -= MS_PER_DAY;
        if (totalCards > 0) {
          currentStreak++;
          expectedMs -= MS_PER_DAY;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Compute longest streak by walking all rows
    let run = 0;
    let prevMs: number | null = null;
    for (const row of rows) {
      const totalCards = row.srsReviewCount + row.sessionCardCount;
      if (totalCards === 0) {
        longestStreak = Math.max(longestStreak, run);
        run = 0;
        prevMs = null;
        continue;
      }
      if (prevMs === null || prevMs - row.dayStartMs === MS_PER_DAY) {
        run++;
        prevMs = row.dayStartMs;
      } else {
        longestStreak = Math.max(longestStreak, run);
        run = 1;
        prevMs = row.dayStartMs;
      }
    }
    longestStreak = Math.max(longestStreak, run);

    return { currentStreak, longestStreak };
  },
});

export const getDailyGoalProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .first();

    const dayResetUtcHour =
      settings?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
    const dayKey = computeDayKey(dayResetUtcHour);

    const todayStats = await ctx.db
      .query("dailyStats")
      .withIndex("by_userId_and_dayKey", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("dayKey", dayKey)
      )
      .first();

    const reviewed =
      (todayStats?.srsReviewCount ?? 0) +
      (todayStats?.sessionCardCount ?? 0);
    const goal = settings?.dailyGoal ?? null;

    return {
      goal,
      reviewed,
      percentage: goal && goal > 0 ? Math.min(1, reviewed / goal) : null,
    };
  },
});

export const getDailyHistory = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    if (!Number.isInteger(args.days) || args.days < 1 || args.days > 365) {
      throw new Error("days must be an integer between 1 and 365");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .first();
    const dayResetUtcHour =
      settings?.dayResetUtcHour ?? SRS_DEFAULTS.DAY_RESET_UTC_HOUR;
    const todayMs = computeDayStartMs(dayResetUtcHour);
    const cutoffMs = todayMs - (args.days - 1) * MS_PER_DAY;

    const rows = await ctx.db
      .query("dailyStats")
      .withIndex("by_userId_and_dayStartMs", (q) =>
        q
          .eq("userId", identity.tokenIdentifier)
          .gte("dayStartMs", cutoffMs)
      )
      .take(args.days + 1);

    return rows.map((row) => {
      const totalCards = row.srsReviewCount + row.sessionCardCount;
      return {
        dayKey: row.dayKey,
        dayStartMs: row.dayStartMs,
        totalCards,
        correctCount: row.correctCount,
        accuracy: totalCards > 0 ? row.correctCount / totalCards : 0,
      };
    });
  },
});

export const getCardStatusBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userSets = await ctx.db
      .query("userSets")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .take(100);

    const enabledSets = userSets.filter((us) => us.srsEnabled);
    if (enabledSets.length === 0)
      return { new: 0, learning: 0, review: 0 };

    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;

    const cardsBySet = await Promise.all(
      enabledSets.map((us) =>
        ctx.db
          .query("srsCards")
          .withIndex("by_userId_and_setId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("setId", us.setId)
          )
          .take(2000)
      )
    );

    for (const cards of cardsBySet) {
      for (const card of cards) {
        if (card.status === "new") newCount++;
        else if (card.status === "learning") learningCount++;
        else reviewCount++;
      }
    }

    return { new: newCount, learning: learningCount, review: reviewCount };
  },
});

export const getPerSetMastery = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userSets = await ctx.db
      .query("userSets")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .take(100);

    const enabledSets = userSets.filter((us) => us.srsEnabled);
    if (enabledSets.length === 0) return [];

    const setIds = enabledSets.map((us) => us.setId);
    const [sets, cardsBySet] = await Promise.all([
      Promise.all(setIds.map((id) => ctx.db.get(id))),
      Promise.all(
        setIds.map((setId) =>
          ctx.db
            .query("srsCards")
            .withIndex("by_userId_and_setId", (q) =>
              q.eq("userId", identity.tokenIdentifier).eq("setId", setId)
            )
            .take(2000)
        )
      ),
    ]);

    const setNameMap = new Map(
      sets.filter((s) => s !== null).map((s) => [s._id, s.name])
    );
    const perSet = new Map<string, {
      newCount: number; learningCount: number; reviewCount: number;
      totalEase: number; total: number;
    }>();
    for (const setId of setIds) {
      perSet.set(setId, { newCount: 0, learningCount: 0, reviewCount: 0, totalEase: 0, total: 0 });
    }

    for (const cards of cardsBySet) {
      for (const card of cards) {
        const entry = perSet.get(card.setId);
        if (!entry) continue;
        entry.total++;
        entry.totalEase += card.easeFactor;
        if (card.status === "new") entry.newCount++;
        else if (card.status === "learning") entry.learningCount++;
        else entry.reviewCount++;
      }
    }

    const results = [];
    for (const [setId, stats] of perSet) {
      const setName = setNameMap.get(setId as typeof setIds[0]);
      if (!setName) continue;
      results.push({
        setId: setId as typeof setIds[0],
        setName,
        total: stats.total,
        new: stats.newCount,
        learning: stats.learningCount,
        review: stats.reviewCount,
        avgEase: stats.total > 0 ? stats.totalEase / stats.total : 0,
      });
    }

    return results;
  },
});
