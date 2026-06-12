"use client";

import type { Preloaded } from "convex/react";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import type { api } from "../../convex/_generated/api";
import StreakBadgeInner from "./StreakBadgeInner";

export default function StreakBadge({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getStreakStats>;
}) {
  const statsResult = useOfflinePreloadedQuery(preloaded);
  if (!statsResult.ok) return null;
  return <StreakBadgeInner stats={statsResult.value} />;
}
