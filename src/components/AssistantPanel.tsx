"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AssistantPanelInner from "./AssistantPanelInner";
import type { Id } from "../../convex/_generated/dataModel";

export type StudyContext = {
  setId: Id<"flashcardSets">;
  setName: string;
  cardFields: Record<string, string>;
};

export default function AssistantPanel({ context }: { context: StudyContext }) {
  const llmKeyStatus = useQuery(api.userSettings.hasLlmKey);
  if (!llmKeyStatus?.hasLlmKey) return null;
  return <AssistantPanelInner context={context} />;
}
