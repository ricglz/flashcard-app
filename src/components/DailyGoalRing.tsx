"use client";

import type { Preloaded } from "convex/react";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";
import { api } from "../../convex/_generated/api";

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type DailyGoalProgress = NonNullable<
  ReturnType<typeof useOfflineQuery<typeof api.progress.getDailyGoalProgress>>
>;

function DailyGoalRingInner({ progress }: { progress: DailyGoalProgress }) {
  if (progress.goal === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>No daily goal set</span>
      </div>
    );
  }

  const percentage = progress.percentage ?? 0;
  const offset = CIRCUMFERENCE * (1 - percentage);
  const isComplete = percentage >= 1;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-raised"
          />
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={
              isComplete ? "text-green-500" : "text-accent"
            }
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">
            {progress.reviewed}/{progress.goal}
          </span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">
          {isComplete ? "Goal reached!" : "Daily goal"}
        </p>
        <p className="text-xs text-muted">
          {Math.round(percentage * 100)}%
        </p>
      </div>
    </div>
  );
}

export default function DailyGoalRing() {
  const progress = useOfflineQuery(api.progress.getDailyGoalProgress);
  if (!progress) return null;
  return <DailyGoalRingInner progress={progress} />;
}

export function PreloadedDailyGoalRing({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.progress.getDailyGoalProgress>;
}) {
  const progress = useOfflinePreloadedQuery(preloaded);
  if (!progress) return null;
  return <DailyGoalRingInner progress={progress} />;
}
