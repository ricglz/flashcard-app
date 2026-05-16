"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";

type Settings = ReturnType<typeof useOfflineQuery<typeof api.userSettings.get>>;

function useTtsControlsInternal(settings: Settings) {
  const updateSettings = useMutation(api.userSettings.updateTtsPlaybackSpeed);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);

  const speed = localTtsSpeed ?? settings?.ttsPlaybackSpeed ?? 0.75;

  const onSpeedChange = useCallback(
    (s: number) => {
      setLocalTtsSpeed(s);
      void updateSettings({ ttsPlaybackSpeed: s });
    },
    [updateSettings],
  );

  const onToggle = useCallback(() => setTtsEnabled((v) => !v), []);

  return { ttsEnabled, speed, onSpeedChange, onToggle };
}

export function useTtsControls() {
  const settings = useOfflineQuery(api.userSettings.get);
  return useTtsControlsInternal(settings);
}

export function useTtsControlsPreloaded(
  preloaded: Preloaded<typeof api.userSettings.get>,
) {
  const settings = useOfflinePreloadedQuery(preloaded);
  return useTtsControlsInternal(settings);
}
