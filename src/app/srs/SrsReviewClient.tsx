"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import QueryErrorState from "@/components/QueryErrorState";
import { getFailureMessage } from "@/lib/domainResultMessage";
import SrsReviewScreen from "./SrsReviewScreen";

type Props = {
  preloadedSession: Preloaded<typeof api.srsReviewQueue.getReviewSession>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
};

export default function SrsReviewClient({
  preloadedSession,
  preloadedTtsConfig,
}: Props) {
  const sessionResult = useOfflinePreloadedQuery(preloadedSession);
  if (!sessionResult.ok) {
    return (
      <QueryErrorState
        title="Review unavailable"
        message={getFailureMessage(sessionResult.error)}
      />
    );
  }
  return (
    <SrsReviewScreen
      session={sessionResult.value}
      preloadedTtsConfig={preloadedTtsConfig}
    />
  );
}
