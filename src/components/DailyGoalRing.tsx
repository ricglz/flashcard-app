"use client";

import type { Preloaded } from "convex/react";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import type { api } from "../../convex/_generated/api";
import DailyGoalRingInner from "./DailyGoalRingInner";

export default function DailyGoalRing({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getDailyGoalProgress>;
}) {
  const progressResult = useOfflinePreloadedQuery(preloaded);
  if (!progressResult.ok) return null;
  return <DailyGoalRingInner progress={progressResult.value} />;
}
