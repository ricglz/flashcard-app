"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { isFailureResult } from "@/lib/appResult";
import { utcHourToLocal, localHourToUtc } from "@/lib/time";
import SrsSettingsPanel from "@/components/SrsSettingsPanel";

export default function SrsSettingsSection() {
  const settings = useOfflineQuery(api.userSettings.get);
  const updateSettings = useMutation(api.userSettings.update);

  const [localMaxNew, setLocalMaxNew] = useState<string | null>(null);
  const [localResetHour, setLocalResetHour] = useState<string | null>(null);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);
  const [localDailyGoal, setLocalDailyGoal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!settings) return null;

  const editMaxValue = localMaxNew ?? String(settings.maxNewCardsPerDay);
  const parsedMaxValue = Math.max(1, Math.min(100, Number(editMaxValue) || 1));
  const editResetHour = localResetHour ?? String(utcHourToLocal(settings.dayResetUtcHour));
  const parsedResetHour = Math.max(0, Math.min(23, Math.round(Number(editResetHour) || 0)));
  const editTtsSpeed = localTtsSpeed ?? settings.ttsPlaybackSpeed;
  const editDailyGoal = localDailyGoal ?? String(settings.dailyGoal ?? 0);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await updateSettings({
        maxNewCardsPerDay: parsedMaxValue,
        dayResetUtcHour: localHourToUtc(parsedResetHour),
        ttsPlaybackSpeed: editTtsSpeed,
        dailyGoal: Math.max(0, Math.min(500, Number(editDailyGoal) || 0)),
      });
      if (isFailureResult(result)) {
        console.error(result.error.message);
        return;
      }
      setLocalMaxNew(null);
      setLocalResetHour(null);
      setLocalTtsSpeed(null);
      setLocalDailyGoal(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-6 border border-edge rounded-xl p-5 space-y-2">
      <h2 className="text-lg font-semibold">Spaced Repetition</h2>
      <p className="text-sm text-muted">
        Daily new card limits, study schedule, and TTS preferences.
      </p>
      <SrsSettingsPanel
        editMaxValue={editMaxValue}
        editResetHour={editResetHour}
        editTtsSpeed={editTtsSpeed}
        editDailyGoal={editDailyGoal}
        isSaving={isSaving}
        onChangeMaxValue={setLocalMaxNew}
        onChangeResetHour={setLocalResetHour}
        onChangeTtsSpeed={setLocalTtsSpeed}
        onChangeDailyGoal={setLocalDailyGoal}
        onSave={handleSave}
      />
    </section>
  );
}
