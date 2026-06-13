"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { getFailureMessage } from "@/lib/domainResultMessage";
import { Alert } from "@/components/ui/Alert";
import SrsSettingsSectionInner from "./SrsSettingsSectionInner";

export default function SrsSettingsSection({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.userSettings.get>;
}) {
  const settingsResult = useOfflinePreloadedQuery(preloaded);
  if (!settingsResult.ok) {
    return (
      <Alert variant="danger" className="mt-6">
        Could not load SRS settings: {getFailureMessage(settingsResult.error)}
      </Alert>
    );
  }
  return <SrsSettingsSectionInner settings={settingsResult.value} />;
}
