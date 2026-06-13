"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";

export default function ProgressStatsBand({
  preloadedStreak,
  preloadedGoal,
}: {
  preloadedStreak: Preloaded<typeof api.progress.getStreakStats>;
  preloadedGoal: Preloaded<typeof api.progress.getDailyGoalProgress>;
}) {
  return (
    <div className="p-4 border border-edge rounded-lg flex items-center justify-between">
      <StreakBadge preloaded={preloadedStreak} />
      <DailyGoalRing preloaded={preloadedGoal} />
    </div>
  );
}
