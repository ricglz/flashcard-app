"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";

type TtsConfig = FunctionReturnType<typeof api.userSettings.getTtsConfig>;

export function useTtsControls(
  preloaded: Preloaded<typeof api.userSettings.getTtsConfig>,
) {
  const config = useOfflinePreloadedQuery(preloaded);
  const updateSettings = useMutation(api.userSettings.updateTtsPlaybackSpeed);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);

  const speed = localTtsSpeed ?? (config as TtsConfig)?.ttsPlaybackSpeed ?? 0.75;

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
