"use client";

import { isFailureResult } from "@/lib/appResult";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";
import type { SrsConfig } from "./SrsSettingsPanel";
import SrsSettingsPanel from "./SrsSettingsPanel";
import SrsQueueEmpty from "./SrsQueueEmpty";
import SrsQueueComplete from "./SrsQueueComplete";
import SrsQueueActive from "./SrsQueueActive";

type QueueStats = NonNullable<FunctionReturnType<typeof api.srsReviewQueue.getQueueStats>>;
type Settings = FunctionReturnType<typeof api.userSettings.get>;

function formatResetTime(dayResetUtcHour: number): string {
  const d = new Date();
  d.setUTCHours(dayResetUtcHour, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SrsQueueStatusInner({
  stats,
  settings,
}: {
  stats: QueueStats;
  settings: Settings;
}) {
  const updateSrsSettings = useMutation(api.userSettings.updateSrsSettings);
  const updateTtsSpeed = useMutation(api.userSettings.updateTtsPlaybackSpeed);
  const forceRefresh = useMutation(api.srsReviewQueue.forceRefreshQueue);

  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noMoreCards, setNoMoreCards] = useState(false);

  async function handleSave(config: SrsConfig): Promise<boolean> {
    setIsSaving(true);
    try {
      const [srsResult, ttsResult] = await Promise.all([
        updateSrsSettings({
          maxNewCardsPerDay: config.maxNewCardsPerDay,
          dayResetUtcHour: config.dayResetUtcHour,
          dailyGoal: config.dailyGoal,
        }),
        updateTtsSpeed({ ttsPlaybackSpeed: config.ttsPlaybackSpeed }),
      ]);
      if (isFailureResult(srsResult)) {
        console.error(srsResult.error.message);
        return false;
      }
      if (isFailureResult(ttsResult)) {
        console.error(ttsResult.error.message);
        return false;
      }
      setShowSettings(false);
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoadMore() {
    setIsLoadingMore(true);
    setNoMoreCards(false);
    try {
      const result = await forceRefresh();
      if (isFailureResult(result)) {
        console.error(result.error.message);
        return;
      }
      if ((result as { added: number }).added === 0) {
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
      settings={{
        maxNewCardsPerDay: settings?.maxNewCardsPerDay ?? 20,
        dayResetUtcHour: settings?.dayResetUtcHour ?? 4,
        ttsPlaybackSpeed: settings?.ttsPlaybackSpeed ?? 0.75,
        dailyGoal: settings?.dailyGoal ?? 0,
      }}
      isSaving={isSaving}
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

export default function SrsQueueStatus({
  preloadedStats,
  preloadedSettings,
}: {
  preloadedStats: Preloaded<typeof api.srsReviewQueue.getQueueStats>;
  preloadedSettings: Preloaded<typeof api.userSettings.get>;
}) {
  const stats = useOfflinePreloadedQuery(preloadedStats);
  const settings = useOfflinePreloadedQuery(preloadedSettings);
  if (!stats) return null;
  return <SrsQueueStatusInner stats={stats} settings={settings} />;
}
