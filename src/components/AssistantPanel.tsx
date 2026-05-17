"use client";

import { useAiAvailable } from "@/hooks/useAiAvailable";
import AssistantPanelInner from "./AssistantPanelInner";
import type { Id } from "../../convex/_generated/dataModel";

export type StudyContext = {
  setId: Id<"flashcardSets">;
  setName: string;
  cardFields: Record<string, string>;
};

export default function AssistantPanel({ context }: { context: StudyContext }) {
  const ai = useAiAvailable();
  if (!ai.available) return null;
  return <AssistantPanelInner context={context} />;
}
