"use client";

import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import SrsSettingsSectionInner from "./SrsSettingsSectionInner";

export default function SrsSettingsSection() {
  const settings = useOfflineQuery(api.userSettings.get);
  if (!settings) return null;
  return <SrsSettingsSectionInner settings={settings} />;
}
