"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { getFailureMessage } from "@/lib/domainResultMessage";
import QueryErrorState from "@/components/QueryErrorState";
import GenerateInner from "./GenerateInner";
import { AvailableModelsProvider } from "@/contexts/AvailableModelsContext";
import type { AvailableModelsSnapshot } from "@/lib/availableModels";

export default function GenerateClient({
  preloadedSets,
  availableModels,
}: {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
  availableModels: AvailableModelsSnapshot;
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

  return (
    <AvailableModelsProvider snapshot={availableModels}>
      <GenerateInner userSets={userSetsResult.value} />
    </AvailableModelsProvider>
  );
}
