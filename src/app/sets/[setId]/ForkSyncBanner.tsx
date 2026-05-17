"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../convex/_generated/api";

export default function ForkSyncBanner({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.flashcardSets.getForkSyncStatus>;
}) {
  const status = usePreloadedQuery(preloaded);
  if (!status) return null;

  if (status.sourceDeleted) {
    return (
      <div className="mb-4 p-3 border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
        The original set has been deleted.
      </div>
    );
  }

  if (status.sourceUpdated) {
    return (
      <div className="mb-4 p-3 border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
        The original set has been updated since you forked it.
      </div>
    );
  }

  return null;
}
