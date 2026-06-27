"use client";

import { Suspense } from "react";
import { useAiAvailable } from "@/hooks/useAiAvailable";
import { Alert } from "@/components/ui/Alert";
import AssistantErrorBoundary from "./AssistantErrorBoundary";
import AssistantPanelInner from "./AssistantPanelInner";
import AssistantPanelSkeleton from "./AssistantPanelSkeleton";
import AvailableModelsSuspenseProvider from "@/contexts/AvailableModelsSuspenseProvider";
import { useAssistantPanel } from "@/contexts/AssistantPanelContext";
import type { Id } from "../../convex/_generated/dataModel";

export type StudyContext = {
  setId: Id<"flashcardSets">;
  cardId: Id<"flashcards">;
  setName: string;
  cardFields: Record<string, string>;
  hasNote: boolean;
};

export default function AssistantPanel({
  context,
}: {
  context: StudyContext;
}) {
  const ai = useAiAvailable();
  const { open, setOpen } = useAssistantPanel();
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
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover flex items-center justify-center text-xl transition-colors"
        aria-label="Open study assistant"
      >
        ?
      </button>
    );
  }
  return (
    <AssistantErrorBoundary>
      <Suspense
        fallback={
          <AssistantPanelSkeleton
            setName={context.setName}
            onClose={() => setOpen(false)}
          />
        }
      >
        <AvailableModelsSuspenseProvider>
          <AssistantPanelInner context={context} />
        </AvailableModelsSuspenseProvider>
      </Suspense>
    </AssistantErrorBoundary>
  );
}
