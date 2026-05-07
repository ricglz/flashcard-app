"use client";

import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { api } from "../../convex/_generated/api";

export default function StreakBadge() {
  const stats = useOfflineQuery(api.progress.getStreakStats);

  if (stats === undefined) return null;
  if (!stats) return null;

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
