"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import SrsSettingsPanel from "./SrsSettingsPanel";
import SrsQueueEmpty from "./SrsQueueEmpty";
import SrsQueueComplete from "./SrsQueueComplete";
import SrsQueueActive from "./SrsQueueActive";

function formatResetTime(dayResetUtcHour: number): string {
  const d = new Date();
  d.setUTCHours(dayResetUtcHour, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function utcHourToLocal(utcHour: number): number {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.getHours();
}

function localHourToUtc(localHour: number): number {
  const d = new Date();
  d.setHours(localHour, 0, 0, 0);
  return d.getUTCHours();
}

export default function SrsQueueStatus() {
  const stats = useOfflineQuery(api.srsReviewQueue.getQueueStats);
  const settings = useOfflineQuery(api.userSettings.get);
  const updateSettings = useMutation(api.userSettings.update);
  const forceRefresh = useMutation(api.srsReviewQueue.forceRefreshQueue);

  const [showSettings, setShowSettings] = useState(false);
  const [localMaxNew, setLocalMaxNew] = useState<string | null>(null);
  const [localResetHour, setLocalResetHour] = useState<string | null>(null);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);
  const [localDailyGoal, setLocalDailyGoal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noMoreCards, setNoMoreCards] = useState(false);

  if (stats === undefined) return null;
  if (stats === null) return null;

  const currentMax = settings?.maxNewCardsPerDay ?? 20;
  const currentResetUtcHour = settings?.dayResetUtcHour ?? 4;
  const editMaxValue = localMaxNew ?? String(currentMax);
  const parsedMaxValue = Math.max(1, Math.min(100, Number(editMaxValue) || 1));
  const editResetHour =
    localResetHour ?? String(utcHourToLocal(currentResetUtcHour));
  const parsedResetHour = Math.max(
    0,
    Math.min(23, Math.round(Number(editResetHour) || 0))
  );
  const currentTtsSpeed = settings?.ttsPlaybackSpeed ?? 0.75;
  const editTtsSpeed = localTtsSpeed ?? currentTtsSpeed;
  const currentDailyGoal = settings?.dailyGoal ?? 0;
  const editDailyGoal = localDailyGoal ?? String(currentDailyGoal);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateSettings({
        maxNewCardsPerDay: parsedMaxValue,
        dayResetUtcHour: localHourToUtc(parsedResetHour),
        ttsPlaybackSpeed: editTtsSpeed,
        dailyGoal: Math.max(0, Math.min(500, Number(editDailyGoal) || 0)),
      });
      setShowSettings(false);
      setLocalMaxNew(null);
      setLocalResetHour(null);
      setLocalTtsSpeed(null);
      setLocalDailyGoal(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoadMore() {
    setIsLoadingMore(true);
    setNoMoreCards(false);
    try {
      const result = await forceRefresh();
      if (result.added === 0) {
        setNoMoreCards(true);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  const resetTimeStr = formatResetTime(stats.dayResetUtcHour);
  const onToggleSettings = () => setShowSettings((v) => !v);

  const settingsPanel = showSettings ? (
    <SrsSettingsPanel
      editMaxValue={editMaxValue}
      editResetHour={editResetHour}
      editTtsSpeed={editTtsSpeed}
      editDailyGoal={editDailyGoal}
      isSaving={isSaving}
      onChangeMaxValue={(v) => setLocalMaxNew(v)}
      onChangeResetHour={(v) => setLocalResetHour(v)}
      onChangeTtsSpeed={(v) => setLocalTtsSpeed(v)}
      onChangeDailyGoal={(v) => setLocalDailyGoal(v)}
      onSave={handleSave}
    />
  ) : null;

  if (stats.remaining === 0 && stats.reviewedToday === 0) {
    return (
      <SrsQueueEmpty
        resetTimeStr={resetTimeStr}
        onToggleSettings={onToggleSettings}
        settingsPanel={settingsPanel}
      />
    );
  }

  if (stats.remaining === 0) {
    return (
      <SrsQueueComplete
        reviewedToday={stats.reviewedToday}
        resetTimeStr={resetTimeStr}
        onToggleSettings={onToggleSettings}
        onLoadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
        noMoreCards={noMoreCards}
        settingsPanel={settingsPanel}
      />
    );
  }

  return (
    <SrsQueueActive
      remaining={stats.remaining}
      reviewedToday={stats.reviewedToday}
      onToggleSettings={onToggleSettings}
      settingsPanel={settingsPanel}
    />
  );
}
