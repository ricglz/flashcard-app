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
  const progress = useOfflinePreloadedQuery(preloaded);
  if (!progress) return null;
  return <DailyGoalRingInner progress={progress} />;
}
