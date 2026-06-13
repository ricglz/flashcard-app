"use client";

import { useAiAvailable } from "@/hooks/useAiAvailable";
import { Alert } from "@/components/ui/Alert";
import AssistantErrorBoundary from "./AssistantErrorBoundary";
import AssistantPanelInner from "./AssistantPanelInner";
import type { Id } from "../../convex/_generated/dataModel";
import type { LlmModel } from "@/lib/aiModels";

export type StudyContext = {
  setId: Id<"flashcardSets">;
  cardId: Id<"flashcards">;
  setName: string;
  cardFields: Record<string, string>;
  hasNote: boolean;
};

export default function AssistantPanel({
  context,
  initialModels,
}: {
  context: StudyContext;
  initialModels?: readonly LlmModel[];
}) {
  const ai = useAiAvailable();
  if (!ai.available) {
    if (ai.reason === "error") {
      return (
        <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] w-80">
          <Alert variant="danger">
            Could not load study assistant settings: {ai.message}
          </Alert>
        </div>
      );
    }
    return null;
  }
  return (
    <AssistantErrorBoundary>
      <AssistantPanelInner context={context} initialModels={initialModels} />
    </AssistantErrorBoundary>
  );
}
