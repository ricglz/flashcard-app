"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AssistantPanelInner from "./AssistantPanelInner";

export default function AssistantPanel() {
  const settings = useQuery(api.userSettings.get);
  if (!settings?.hasLlmKey) return null;
  return <AssistantPanelInner />;
}
