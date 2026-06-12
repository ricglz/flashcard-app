"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { buildCacheKey, useOfflineQuery } from "@/hooks/useOfflineQuery";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { deleteCachedQuery } from "@/lib/offlineDb";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";
import DailyActivityChart from "@/components/DailyActivityChart";
import AccuracyChart from "@/components/AccuracyChart";
import CardStatusBreakdown from "@/components/CardStatusBreakdown";
import SetMasteryList from "@/components/SetMasteryList";
import { classifyProgressHistoryResult } from "./progressHistoryState";

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
  const historyResult = useOfflineQuery(api.progress.getDailyHistory, { days });
  const historyState = classifyProgressHistoryResult(historyResult);
  const history =
    historyState.status === "ready" ? historyState.history : undefined;
  const srsSummaryResult = useOfflinePreloadedQuery(preloadedSrsSummary);
  const breakdown = srsSummaryResult.ok
    ? srsSummaryResult.value.breakdown
    : { new: 0, learning: 0, review: 0 };
  const mastery = srsSummaryResult.ok ? srsSummaryResult.value.mastery : [];
  const historyCacheKey = buildCacheKey(api.progress.getDailyHistory, { days });

  useEffect(() => {
    if (historyState.status !== "malformedCache") return;

    Sentry.captureMessage("Malformed cached progress history result", {
      level: "warning",
      tags: {
        query: "progress.getDailyHistory",
      },
      contexts: {
        progressHistory: {
          days,
        },
      },
    });
    void deleteCachedQuery(historyCacheKey);
  }, [days, historyCacheKey, historyState.status]);

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

      {!srsSummaryResult.ok && (
        <div className="h-24 flex items-center justify-center text-sm text-muted">
          {srsSummaryResult.error.message}
        </div>
      )}

      {historyState.status === "loading" ? (
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : historyState.status === "error" ||
        historyState.status === "malformedCache" ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted">
          {historyState.message}
        </div>
      ) : (
        <DailyActivityChart
          history={historyState.history}
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
