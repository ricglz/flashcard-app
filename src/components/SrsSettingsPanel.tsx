export default function SrsSettingsPanel({
  editMaxValue,
  editResetHour,
  editTtsSpeed,
  editDailyGoal,
  isSaving,
  onChangeMaxValue,
  onChangeResetHour,
  onChangeTtsSpeed,
  onChangeDailyGoal,
  onSave,
}: {
  editMaxValue: string;
  editResetHour: string;
  editTtsSpeed: number;
  editDailyGoal: string;
  isSaving: boolean;
  onChangeMaxValue: (v: string) => void;
  onChangeResetHour: (v: string) => void;
  onChangeTtsSpeed: (v: number) => void;
  onChangeDailyGoal: (v: string) => void;
  onSave: () => void;
}) {
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
          onChange={(e) => onChangeMaxValue(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(
              1,
              Math.min(100, Number(e.target.value) || 1)
            );
            onChangeMaxValue(String(clamped));
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
          onChange={(e) => onChangeResetHour(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(
              0,
              Math.min(23, Math.round(Number(e.target.value) || 0))
            );
            onChangeResetHour(String(clamped));
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
          onChange={(e) => onChangeTtsSpeed(Number(e.target.value))}
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
          onChange={(e) => onChangeDailyGoal(e.target.value)}
          onBlur={(e) => {
            const clamped = Math.max(
              0,
              Math.min(500, Number(e.target.value) || 0)
            );
            onChangeDailyGoal(String(clamped));
          }}
          className="w-20 px-2 py-1 text-sm border rounded-lg bg-transparent border-edge"
        />
      </div>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="px-3 py-1 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {isSaving ? "..." : "Save"}
      </button>
    </div>
  );
}
