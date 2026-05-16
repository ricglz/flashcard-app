"use client";

import type { Preloaded } from "convex/react";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";
import { api } from "../../convex/_generated/api";

type StreakStats = NonNullable<
  ReturnType<typeof useOfflineQuery<typeof api.progress.getStreakStats>>
>;

function StreakBadgeInner({ stats }: { stats: StreakStats }) {
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

export default function StreakBadge() {
  const stats = useOfflineQuery(api.progress.getStreakStats);
  if (!stats) return null;
  return <StreakBadgeInner stats={stats} />;
}

export function PreloadedStreakBadge({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getStreakStats>;
}) {
  const stats = useOfflinePreloadedQuery(preloaded);
  if (!stats) return null;
  return <StreakBadgeInner stats={stats} />;
}
