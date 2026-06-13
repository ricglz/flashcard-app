"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { getFailureMessage } from "@/lib/domainResultMessage";

export function useTtsControls(
  preloaded: Preloaded<typeof api.userSettings.getTtsConfig>,
) {
  const configResult = useOfflinePreloadedQuery(preloaded);
  const updateSettings = useMutation(api.userSettings.updateTtsPlaybackSpeed);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);

  const speed = localTtsSpeed ?? (configResult.ok ? configResult.value.ttsPlaybackSpeed : 0.75);
  const errorMessage = configResult.ok
    ? null
    : `Could not load TTS settings; using defaults. ${getFailureMessage(configResult.error)}`;

  const onSpeedChange = useCallback(
    (s: number) => {
      setLocalTtsSpeed(s);
      void updateSettings({ ttsPlaybackSpeed: s });
    },
    [updateSettings],
  );

  const onToggle = useCallback(() => setTtsEnabled((v) => !v), []);

  return { ttsEnabled, speed, onSpeedChange, onToggle, errorMessage };
}
