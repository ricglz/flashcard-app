"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";
import { PreloadedStreakBadge } from "@/components/StreakBadge";
import { PreloadedDailyGoalRing } from "@/components/DailyGoalRing";
import DailyActivityChart from "@/components/DailyActivityChart";
import AccuracyChart from "@/components/AccuracyChart";
import CardStatusBreakdown from "@/components/CardStatusBreakdown";
import SetMasteryList from "@/components/SetMasteryList";

type Props = {
  preloadedBreakdown: Preloaded<typeof api.progress.getCardStatusBreakdown>;
  preloadedMastery: Preloaded<typeof api.progress.getPerSetMastery>;
  preloadedStreak: Preloaded<typeof api.progress.getStreakStats>;
  preloadedGoal: Preloaded<typeof api.progress.getDailyGoalProgress>;
};

export default function ProgressClient({
  preloadedBreakdown,
  preloadedMastery,
  preloadedStreak,
  preloadedGoal,
}: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const history = useOfflineQuery(api.progress.getDailyHistory, { days });
  const breakdown = useOfflinePreloadedQuery(preloadedBreakdown);
  const mastery = useOfflinePreloadedQuery(preloadedMastery);

  const maxCards =
    history && history.length > 0
      ? Math.max(...history.map((d) => d.totalCards))
      : 0;

  const totalBreakdown = breakdown
    ? breakdown.new + breakdown.learning + breakdown.review
    : 0;

  return (
    <div className="space-y-8">
      <div className="p-4 border border-edge rounded-lg flex items-center justify-between">
        <PreloadedStreakBadge preloaded={preloadedStreak} />
        <PreloadedDailyGoalRing preloaded={preloadedGoal} />
      </div>

      {history === undefined ? (
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <DailyActivityChart
          history={history}
          maxCards={maxCards}
          days={days}
          onDaysChange={setDays}
        />
      )}

      {history && history.length > 0 && <AccuracyChart history={history} />}

      {breakdown && totalBreakdown > 0 && (
        <CardStatusBreakdown breakdown={breakdown} />
      )}

      {mastery && mastery.length > 0 && <SetMasteryList mastery={mastery} />}
    </div>
  );
}
