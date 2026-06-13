"use client";

import type { Preloaded } from "convex/react";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import type { api } from "../../convex/_generated/api";
import { getFailureMessage } from "@/lib/domainResultMessage";
import StreakBadgeInner from "./StreakBadgeInner";

export default function StreakBadge({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getStreakStats>;
}) {
  const statsResult = useOfflinePreloadedQuery(preloaded);
  if (!statsResult.ok) {
    return (
      <p className="text-xs text-danger">
        Could not load streak: {getFailureMessage(statsResult.error)}
      </p>
    );
  }
  return <StreakBadgeInner stats={statsResult.value} />;
}
