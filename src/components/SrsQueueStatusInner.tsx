"use client";


import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { SrsConfig } from "./SrsSettingsPanel";
import SrsSettingsPanel from "./SrsSettingsPanel";
import SrsQueueEmpty from "./SrsQueueEmpty";
import SrsQueueComplete from "./SrsQueueComplete";
import SrsQueueActive from "./SrsQueueActive";
import InlineError from "./InlineError";
import { useForceRefreshQueue } from "@/hooks/useForceRefreshQueue";
import { useSaveHandler } from "@/hooks/useSaveHandler";

type QueueStats = Extract<
  FunctionReturnType<typeof api.srsReviewQueue.getQueueStats>,
  { ok: true }
>["value"];
type Settings =
  | Extract<
      FunctionReturnType<typeof api.userSettings.get>,
      { ok: true }
    >["value"]
  | null;

function formatResetTime(dayResetUtcHour: number): string {
  const d = new Date();
  d.setUTCHours(dayResetUtcHour, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SrsQueueStatusInner({
  stats,
  settings,
}: {
  stats: QueueStats;
  settings: Settings;
}) {
  const updateSrsSettings = useMutation(api.userSettings.updateSrsSettings);
  const updateTtsSpeed = useMutation(api.userSettings.updateTtsPlaybackSpeed);
  const {
    handleLoadMore,
    isLoadingMore,
    noMoreCards,
    error: refreshError,
    clearError: clearRefreshError,
  } = useForceRefreshQueue();

  const [showSettings, setShowSettings] = useState(false);
  const { execute, isSaving, error, setError } = useSaveHandler<boolean>({
    onSuccess: () => setShowSettings(false),
  });
  const displayError = error ?? refreshError;

  async function handleSave(config: SrsConfig): Promise<boolean> {
    const result = await execute(async () => {
      const [srsResult, ttsResult] = await Promise.all([
        updateSrsSettings({
          maxNewCardsPerDay: config.maxNewCardsPerDay,
          dayResetUtcHour: config.dayResetUtcHour,
          dailyGoal: config.dailyGoal,
        }),
        updateTtsSpeed({ ttsPlaybackSpeed: config.ttsPlaybackSpeed }),
      ]);
      if (!srsResult.ok) return srsResult;
      if (!ttsResult.ok) return ttsResult;
      return { ok: true, value: true } as const;
    });
    return result !== null;
  }

  const resetTimeStr = formatResetTime(stats.dayResetUtcHour);
  const onToggleSettings = () => {
    setShowSettings((v) => !v);
    setError(null);
    clearRefreshError();
  };

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
      <>
        <InlineError message={displayError} />
        <SrsQueueEmpty
          resetTimeStr={resetTimeStr}
          onToggleSettings={onToggleSettings}
          settingsPanel={settingsPanel}
        />
      </>
    );
  }

  if (stats.remaining === 0) {
    return (
      <>
        <InlineError message={displayError} />
        <SrsQueueComplete
          reviewedToday={stats.reviewedToday}
          resetTimeStr={resetTimeStr}
          onToggleSettings={onToggleSettings}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          noMoreCards={noMoreCards}
          settingsPanel={settingsPanel}
        />
      </>
    );
  }

  return (
    <>
      <InlineError message={displayError} />
      <SrsQueueActive
        remaining={stats.remaining}
        reviewedToday={stats.reviewedToday}
        onToggleSettings={onToggleSettings}
        settingsPanel={settingsPanel}
      />
    </>
  );
}
