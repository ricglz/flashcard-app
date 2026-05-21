"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";
import DailyActivityChart from "@/components/DailyActivityChart";
import AccuracyChart from "@/components/AccuracyChart";
import CardStatusBreakdown from "@/components/CardStatusBreakdown";
import SetMasteryList from "@/components/SetMasteryList";

type Props = {
  preloadedSrsSummary: Preloaded<typeof api.progress.getSrsProgressSummary>;
  preloadedStreak: Preloaded<typeof api.progress.getStreakStats>;
  preloadedGoal: Preloaded<typeof api.progress.getDailyGoalProgress>;
};

export default function ProgressClient({
  preloadedSrsSummary,
  preloadedStreak,
  preloadedGoal,
}: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const history = useOfflineQuery(api.progress.getDailyHistory, { days });
  const srsSummary = useOfflinePreloadedQuery(preloadedSrsSummary);
  const breakdown = srsSummary.breakdown;
  const mastery = srsSummary.mastery;

  const maxCards =
    history && history.length > 0
      ? Math.max(...history.map((d) => d.totalCards))
      : 0;

  const totalBreakdown = breakdown.new + breakdown.learning + breakdown.review;

  return (
    <div className="space-y-8">
      <div className="p-4 border border-edge rounded-lg flex items-center justify-between">
        <StreakBadge preloaded={preloadedStreak} />
        <DailyGoalRing preloaded={preloadedGoal} />
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

      {totalBreakdown > 0 && (
        <CardStatusBreakdown breakdown={breakdown} />
      )}

      {mastery.length > 0 && <SetMasteryList mastery={mastery} />}
    </div>
  );
}
