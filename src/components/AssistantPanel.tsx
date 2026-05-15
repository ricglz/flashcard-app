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
  const settings = useQuery(api.userSettings.get);
  if (!settings?.hasLlmKey) return null;
  return <AssistantPanelInner context={context} />;
}
