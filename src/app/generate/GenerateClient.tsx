"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { getFailureMessage } from "@/lib/domainResultMessage";
import QueryErrorState from "@/components/QueryErrorState";
import GenerateInner from "./GenerateInner";

export default function GenerateClient({
  preloadedSets,
}: {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
}) {
  const userSetsResult = useOfflinePreloadedQuery(preloadedSets);
  if (!userSetsResult.ok) {
    return (
      <QueryErrorState
        title="AI generation unavailable"
        message={getFailureMessage(userSetsResult.error)}
      />
    );
  }

  return <GenerateInner userSets={userSetsResult.value} />;
}
