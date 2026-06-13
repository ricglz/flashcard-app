"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { getFailureMessage } from "@/lib/domainResultMessage";
import InlineError from "./InlineError";
import SrsQueueStatusInner from "./SrsQueueStatusInner";

export default function SrsQueueStatus({
  preloadedStats,
  preloadedSettings,
}: {
  preloadedStats: Preloaded<typeof api.srsReviewQueue.getQueueStats>;
  preloadedSettings: Preloaded<typeof api.userSettings.get>;
}) {
  const statsResult = useOfflinePreloadedQuery(preloadedStats);
  if (!statsResult.ok) {
    return (
      <InlineError
        message={`Could not load SRS queue: ${getFailureMessage(statsResult.error)}`}
      />
    );
  }
  return (
    <SrsQueueStatusInner
      stats={statsResult.value}
      preloadedSettings={preloadedSettings}
    />
  );
}
