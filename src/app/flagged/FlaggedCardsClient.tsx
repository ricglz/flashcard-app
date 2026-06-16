"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import QueryErrorState from "@/components/QueryErrorState";
import { getFailureMessage } from "@/lib/domainResultMessage";
import type { LlmModel } from "@/lib/aiModels";
import { AvailableModelsProvider } from "@/contexts/AvailableModelsContext";
import FlaggedCardsInner from "./FlaggedCardsInner";

type Props = {
  preloaded: Preloaded<typeof api.cardAnnotations.getFlagged>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  initialAssistantModels?: readonly LlmModel[];
};

export default function FlaggedCardsClient({
  preloaded,
  preloadedTtsConfig,
  initialAssistantModels,
}: Props) {
  const flaggedResult = useOfflinePreloadedQuery(preloaded);
  if (!flaggedResult.ok) {
    return (
      <QueryErrorState
        title="Flagged cards unavailable"
        message={getFailureMessage(flaggedResult.error)}
      />
    );
  }

  return (
    <AvailableModelsProvider initialModels={initialAssistantModels}>
      <FlaggedCardsInner
        flaggedCards={flaggedResult.value}
        preloadedTtsConfig={preloadedTtsConfig}
        initialAssistantModels={initialAssistantModels}
      />
    </AvailableModelsProvider>
  );
}
