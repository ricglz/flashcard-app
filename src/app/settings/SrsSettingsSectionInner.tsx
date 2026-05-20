"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

import type { SrsConfig } from "@/components/SrsSettingsPanel";
import SrsSettingsPanel from "@/components/SrsSettingsPanel";
import { useSaveHandler } from "@/hooks/useSaveHandler";

type Settings = NonNullable<FunctionReturnType<typeof api.userSettings.get>>;

export default function SrsSettingsSectionInner({ settings }: { settings: Settings }) {
  const updateSrsSettings = useMutation(api.userSettings.updateSrsSettings);
  const updateTtsSpeed = useMutation(api.userSettings.updateTtsPlaybackSpeed);

  const { execute, isSaving } = useSaveHandler();

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

  return (
    <section className="mt-6 border border-edge rounded-xl p-5 space-y-2">
      <h2 className="text-lg font-semibold">Spaced Repetition</h2>
      <p className="text-sm text-muted">
        Daily new card limits, study schedule, and TTS preferences.
      </p>
      <SrsSettingsPanel
        settings={{
          maxNewCardsPerDay: settings.maxNewCardsPerDay,
          dayResetUtcHour: settings.dayResetUtcHour,
          ttsPlaybackSpeed: settings.ttsPlaybackSpeed,
          dailyGoal: settings.dailyGoal ?? 0,
        }}
        isSaving={isSaving}
        onSave={handleSave}
      />
    </section>
  );
}
