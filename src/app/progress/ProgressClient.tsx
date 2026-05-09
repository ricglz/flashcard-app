"use client";

import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";

export default function ProgressClient() {
  const [days, setDays] = useState<7 | 30>(7);
  const history = useOfflineQuery(api.progress.getDailyHistory, { days });
  const breakdown = useOfflineQuery(api.progress.getCardStatusBreakdown);
  const mastery = useOfflineQuery(api.progress.getPerSetMastery);

  const maxCards =
    history && history.length > 0
      ? Math.max(...history.map((d) => d.totalCards))
      : 0;

  const totalBreakdown = breakdown
    ? breakdown.new + breakdown.learning + breakdown.review
    : 0;

  return (
    <div className="space-y-8">
      {/* Streak + Goal */}
      <div className="p-4 border border-edge rounded-lg flex items-center justify-between">
        <StreakBadge />
        <DailyGoalRing />
      </div>

      {/* Daily Activity Chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Daily Activity</h2>
          <div className="flex gap-1">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  days === d
                    ? "bg-accent text-white"
                    : "border border-edge hover:bg-surface-hover"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {history === undefined ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="h-40 flex items-center justify-center border border-edge rounded-lg">
            <p className="text-sm text-muted">
              No activity yet. Start reviewing to see your stats!
            </p>
          </div>
        ) : (
          <div className="border border-edge rounded-lg p-4">
            <div className="flex items-end gap-1 h-32">
              {history.map((day) => {
                const heightPx =
                  maxCards > 0
                    ? Math.max(4, (day.totalCards / maxCards) * 112)
                    : 4;
                const label = day.dayKey.slice(5);
                return (
                  <div
                    key={day.dayKey}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-muted">
                      {day.totalCards > 0 ? day.totalCards : ""}
                    </span>
                    <div
                      className="w-full rounded-t bg-accent transition-all"
                      style={{ height: `${heightPx}px` }}
                    />
                    <span className="text-[9px] text-muted">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accuracy Trend */}
      {history && history.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Accuracy</h2>
          <div className="border border-edge rounded-lg p-4">
            <div className="flex items-end gap-1 h-24">
              {history.map((day) => {
                const heightPx = Math.max(4, day.accuracy * 80);
                return (
                  <div
                    key={day.dayKey}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-muted">
                      {day.totalCards > 0
                        ? `${Math.round(day.accuracy * 100)}%`
                        : ""}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        day.accuracy >= 0.8
                          ? "bg-green-500"
                          : day.accuracy >= 0.5
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ height: `${heightPx}px` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Card Status Breakdown */}
      {breakdown && totalBreakdown > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Card Status</h2>
          <div className="border border-edge rounded-lg p-4">
            <div className="flex rounded-lg overflow-hidden h-6 mb-3">
              {breakdown.review > 0 && (
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(breakdown.review / totalBreakdown) * 100}%`,
                  }}
                />
              )}
              {breakdown.learning > 0 && (
                <div
                  className="bg-yellow-500"
                  style={{
                    width: `${(breakdown.learning / totalBreakdown) * 100}%`,
                  }}
                />
              )}
              {breakdown.new > 0 && (
                <div
                  className="bg-gray-300 dark:bg-gray-600"
                  style={{
                    width: `${(breakdown.new / totalBreakdown) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500" />
                Review: {breakdown.review}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-yellow-500" />
                Learning: {breakdown.learning}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" />
                New: {breakdown.new}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Per-Set Mastery */}
      {mastery && mastery.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Set Mastery</h2>
          <div className="space-y-3">
            {mastery.map((s) => {
              const pct =
                s.total > 0
                  ? Math.round((s.review / s.total) * 100)
                  : 0;
              return (
                <div
                  key={s.setId}
                  className="border border-edge rounded-lg p-3"
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{s.setName}</span>
                    <span className="text-xs text-muted">{pct}% mastered</span>
                  </div>
                  <div className="h-2 bg-raised rounded-full overflow-hidden flex">
                    {s.review > 0 && (
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(s.review / s.total) * 100}%` }}
                      />
                    )}
                    {s.learning > 0 && (
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${(s.learning / s.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-muted">
                    <span>{s.review} review</span>
                    <span>{s.learning} learning</span>
                    <span>{s.new} new</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
