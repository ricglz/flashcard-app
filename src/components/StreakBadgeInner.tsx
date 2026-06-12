"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type StreakStats = Extract<
  FunctionReturnType<typeof api.progress.getStreakStats>,
  { ok: true }
>["value"];

export default function StreakBadgeInner({ stats }: { stats: StreakStats }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl" role="img" aria-label="streak">
        {stats.currentStreak > 0 ? "🔥" : "❄️"}
      </span>
      <div>
        <p className="font-bold text-lg leading-tight">
          {stats.currentStreak}
        </p>
        <p className="text-xs text-muted">
          {stats.currentStreak === 1
            ? "day streak"
            : stats.currentStreak > 0
              ? "day streak"
              : "Start your streak!"}
        </p>
      </div>
      {stats.longestStreak > stats.currentStreak && (
        <p className="text-xs text-muted ml-2">
          Best: {stats.longestStreak}
        </p>
      )}
    </div>
  );
}
