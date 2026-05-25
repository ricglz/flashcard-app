"use client";

import { utcHourToLocal, localHourToUtc } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { useDraftValue } from "@/hooks/useDraftValue";

export type SrsConfig = {
  maxNewCardsPerDay: number;
  dayResetUtcHour: number;
  ttsPlaybackSpeed: number;
  dailyGoal: number;
};

export default function SrsSettingsPanel({
  settings,
  isSaving,
  onSave,
}: {
  settings: {
    maxNewCardsPerDay: number;
    dayResetUtcHour: number;
    ttsPlaybackSpeed: number;
    dailyGoal: number;
  };
  isSaving: boolean;
  onSave: (config: SrsConfig) => Promise<boolean>;
}) {
  const maxNewDraft = useDraftValue(String(settings.maxNewCardsPerDay));
  const resetHourDraft = useDraftValue(String(utcHourToLocal(settings.dayResetUtcHour)));
  const ttsSpeedDraft = useDraftValue(settings.ttsPlaybackSpeed);
  const dailyGoalDraft = useDraftValue(String(settings.dailyGoal));

  const editMaxValue = maxNewDraft.value;
  const editResetHour = resetHourDraft.value;
  const editTtsSpeed = ttsSpeedDraft.value;
  const editDailyGoal = dailyGoalDraft.value;

  async function handleSave() {
    const parsedMax = Math.max(1, Math.min(100, Number(editMaxValue) || 1));
    const parsedHour = Math.max(
      0,
      Math.min(23, Math.round(Number(editResetHour) || 0))
    );
    const parsedGoal = Math.max(
      0,
      Math.min(500, Number(editDailyGoal) || 0)
    );
    const success = await onSave({
      maxNewCardsPerDay: parsedMax,
      dayResetUtcHour: localHourToUtc(parsedHour),
      ttsPlaybackSpeed: editTtsSpeed,
      dailyGoal: parsedGoal,
    });
    if (success) {
      maxNewDraft.resetDraft();
      resetHourDraft.resetDraft();
      ttsSpeedDraft.resetDraft();
      dailyGoalDraft.resetDraft();
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-edge space-y-3">
      <div>
        <label className="text-xs text-muted block mb-1">
          New cards per day (across all sets)
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={editMaxValue}
          onChange={(e) => maxNewDraft.setDraftValue(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(
              1,
              Math.min(100, Number(e.target.value) || 1)
            );
            maxNewDraft.setDraftValue(String(clamped));
          }}
          className="w-20 px-2 py-1 text-sm border rounded-lg bg-transparent border-edge"
        />
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">
          Day resets at (local hour, 0-23)
        </label>
        <input
          type="number"
          min={0}
          max={23}
          value={editResetHour}
          onChange={(e) => resetHourDraft.setDraftValue(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(
              0,
              Math.min(23, Math.round(Number(e.target.value) || 0))
            );
            resetHourDraft.setDraftValue(String(clamped));
          }}
          className="w-20 px-2 py-1 text-sm border rounded-lg bg-transparent border-edge"
        />
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">
          TTS playback speed: {editTtsSpeed}x
        </label>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.25}
          value={editTtsSpeed}
          onChange={(e) => ttsSpeedDraft.setDraftValue(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-muted mt-0.5">
          <span>0.25x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">
          Daily card goal (0 = none)
        </label>
        <input
          type="number"
          min={0}
          max={500}
          value={editDailyGoal}
          onChange={(e) => dailyGoalDraft.setDraftValue(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(
              0,
              Math.min(500, Number(e.target.value) || 0)
            );
            dailyGoalDraft.setDraftValue(String(clamped));
          }}
          className="w-20 px-2 py-1 text-sm border rounded-lg bg-transparent border-edge"
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={isSaving}
        size="sm"
        loading={isSaving}
      >
        Save
      </Button>
    </div>
  );
}
