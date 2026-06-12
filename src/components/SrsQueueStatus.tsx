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
  const statsResult = useOfflinePreloadedQuery(preloadedStats);
  const settingsResult = useOfflinePreloadedQuery(preloadedSettings);
  if (!statsResult.ok) return null;
  return (
    <SrsQueueStatusInner
      stats={statsResult.value}
      settings={settingsResult.ok ? settingsResult.value : null}
    />
  );
}
