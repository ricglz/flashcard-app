"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function SrsQueueStatus() {
  const stats = useQuery(api.srsReviewQueue.getQueueStats);

  if (stats === undefined) return null;
  if (stats === null) return null;

  if (stats.remaining === 0 && stats.reviewedToday === 0) return null;

  if (stats.remaining === 0) {
    return (
      <div className="mb-6 p-4 border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 rounded-lg text-center">
        <p className="text-green-700 dark:text-green-300 font-medium">
          All done for today! You reviewed {stats.reviewedToday} card
          {stats.reviewedToday !== 1 ? "s" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 border border-accent/30 bg-accent/5 rounded-lg flex items-center justify-between">
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
      <Link
        href="/srs"
        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-colors"
      >
        Start Review
      </Link>
    </div>
  );
}
