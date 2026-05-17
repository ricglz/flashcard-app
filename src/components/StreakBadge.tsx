"use client";

import type { Preloaded } from "convex/react";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";
import type { api } from "../../convex/_generated/api";
import StreakBadgeInner from "./StreakBadgeInner";

export default function StreakBadge({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getStreakStats>;
}) {
  const stats = useOfflinePreloadedQuery(preloaded);
  if (!stats) return null;
  return <StreakBadgeInner stats={stats} />;
}
