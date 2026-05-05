"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

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
  const stats = useQuery(api.srsReviewQueue.getQueueStats);
  const settings = useQuery(api.userSettings.get);
  const updateSettings = useMutation(api.userSettings.update);
  const [showSettings, setShowSettings] = useState(false);
  const [localMaxNew, setLocalMaxNew] = useState<string | null>(null);
  const [localResetHour, setLocalResetHour] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateSettings({
        maxNewCardsPerDay: parsedMaxValue,
        dayResetUtcHour: localHourToUtc(parsedResetHour),
      });
      setShowSettings(false);
      setLocalMaxNew(null);
      setLocalResetHour(null);
    } finally {
      setIsSaving(false);
    }
  }

  const resetTimeStr = formatResetTime(stats.dayResetUtcHour);

  if (stats.remaining === 0 && stats.reviewedToday === 0) {
    return (
      <div className="mb-6 p-4 border border-edge rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">No cards to review right now.</p>
            <p className="text-xs text-muted mt-1">
              Next reset at {resetTimeStr}
            </p>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="SRS settings"
          >
            <GearIcon />
          </button>
        </div>
        {showSettings && (
          <SettingsPanel
            editMaxValue={editMaxValue}
            editResetHour={editResetHour}
            isSaving={isSaving}
            onChangeMaxValue={(v) => setLocalMaxNew(v)}
            onChangeResetHour={(v) => setLocalResetHour(v)}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  if (stats.remaining === 0) {
    return (
      <div className="mb-6 p-4 border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-700 dark:text-green-300 font-medium">
              All done for today! You reviewed {stats.reviewedToday} card
              {stats.reviewedToday !== 1 ? "s" : ""}.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Next reset at {resetTimeStr}
            </p>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            aria-label="SRS settings"
          >
            <GearIcon />
          </button>
        </div>
        {showSettings && (
          <SettingsPanel
            editMaxValue={editMaxValue}
            editResetHour={editResetHour}
            isSaving={isSaving}
            onChangeMaxValue={(v) => setLocalMaxNew(v)}
            onChangeResetHour={(v) => setLocalResetHour(v)}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 border border-accent/30 bg-accent/5 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {stats.remaining} card{stats.remaining !== 1 ? "s" : ""} to review
          </p>
          {stats.reviewedToday > 0 && (
            <p className="text-sm text-muted">
              {stats.reviewedToday} reviewed today
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="SRS settings"
          >
            <GearIcon />
          </button>
          <Link
            href="/srs"
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-colors"
          >
            Start Review
          </Link>
        </div>
      </div>
      {showSettings && (
        <SettingsPanel
          editMaxValue={editMaxValue}
          editResetHour={editResetHour}
          isSaving={isSaving}
          onChangeMaxValue={(v) => setLocalMaxNew(v)}
          onChangeResetHour={(v) => setLocalResetHour(v)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SettingsPanel({
  editMaxValue,
  editResetHour,
  isSaving,
  onChangeMaxValue,
  onChangeResetHour,
  onSave,
}: {
  editMaxValue: string;
  editResetHour: string;
  isSaving: boolean;
  onChangeMaxValue: (v: string) => void;
  onChangeResetHour: (v: string) => void;
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
