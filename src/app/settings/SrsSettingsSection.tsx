"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import SrsSettingsSectionInner from "./SrsSettingsSectionInner";

export default function SrsSettingsSection({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.userSettings.get>;
}) {
  const settingsResult = useOfflinePreloadedQuery(preloaded);
  if (!settingsResult.ok) return null;
  return <SrsSettingsSectionInner settings={settingsResult.value} />;
}
