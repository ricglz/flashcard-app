"use client";

import { useAiAvailable } from "@/hooks/useAiAvailable";
import AssistantErrorBoundary from "./AssistantErrorBoundary";
import AssistantPanelInner from "./AssistantPanelInner";
import type { Id } from "../../convex/_generated/dataModel";

export type StudyContext = {
  setId: Id<"flashcardSets">;
  cardId: Id<"flashcards">;
  setName: string;
  cardFields: Record<string, string>;
  hasNote: boolean;
};

export default function AssistantPanel({ context }: { context: StudyContext }) {
  const ai = useAiAvailable();
  if (!ai.available) return null;
  return (
    <AssistantErrorBoundary>
      <AssistantPanelInner context={context} />
    </AssistantErrorBoundary>
  );
}
