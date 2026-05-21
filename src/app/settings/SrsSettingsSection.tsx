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
  const settings = useOfflinePreloadedQuery(preloaded);
  if (!settings) return null;
  return <SrsSettingsSectionInner settings={settings} />;
}
