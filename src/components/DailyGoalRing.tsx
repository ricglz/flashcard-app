"use client";

import type { Preloaded } from "convex/react";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import type { api } from "../../convex/_generated/api";
import { getFailureMessage } from "@/lib/domainResultMessage";
import DailyGoalRingInner from "./DailyGoalRingInner";

export default function DailyGoalRing({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getDailyGoalProgress>;
}) {
  const progressResult = useOfflinePreloadedQuery(preloaded);
  if (!progressResult.ok) {
    return (
      <p className="text-xs text-danger">
        Could not load daily goal: {getFailureMessage(progressResult.error)}
      </p>
    );
  }
  return <DailyGoalRingInner progress={progressResult.value} />;
}
