"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../convex/_generated/api";
import { Alert } from "@/components/ui/Alert";

export default function ForkSyncBanner({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.flashcardSets.getForkSyncStatus>;
}) {
  const status = usePreloadedQuery(preloaded);
  if (!status) return null;

  if (status.sourceDeleted) {
    return (
      <Alert variant="warning" className="mb-4">
        The original set has been deleted.
      </Alert>
    );
  }

  if (status.sourceUpdated) {
    return (
      <Alert variant="info" className="mb-4">
        The original set has been updated since you forked it.
      </Alert>
    );
  }

  return null;
}
