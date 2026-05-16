"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";

export function useTtsControls() {
  const settings = useOfflineQuery(api.userSettings.get);
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
