"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import SrsQueueStatusInner from "./SrsQueueStatusInner";

export default function SrsQueueStatus({
  preloadedStats,
  preloadedSettings,
}: {
  preloadedStats: Preloaded<typeof api.srsReviewQueue.getQueueStats>;
  preloadedSettings: Preloaded<typeof api.userSettings.get>;
}) {
  const stats = useOfflinePreloadedQuery(preloadedStats);
  const settings = useOfflinePreloadedQuery(preloadedSettings);
  if (!stats) return null;
  return <SrsQueueStatusInner stats={stats} settings={settings} />;
}
