"use client";

import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";
import DailyActivityChart from "@/components/DailyActivityChart";
import AccuracyChart from "@/components/AccuracyChart";
import CardStatusBreakdown from "@/components/CardStatusBreakdown";
import SetMasteryList from "@/components/SetMasteryList";

export default function ProgressClient() {
  const [days, setDays] = useState<7 | 30>(7);
  const history = useOfflineQuery(api.progress.getDailyHistory, { days });
  const breakdown = useOfflineQuery(api.progress.getCardStatusBreakdown);
  const mastery = useOfflineQuery(api.progress.getPerSetMastery);

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
        <StreakBadge />
        <DailyGoalRing />
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
