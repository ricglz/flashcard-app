"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../../convex/_generated/api";
import { Alert } from "@/components/ui/Alert";
import { getFailureMessage } from "@/lib/domainResultMessage";

export default function ForkSyncBanner({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.flashcardSets.getForkSyncStatus>;
}) {
  const statusResult = usePreloadedQuery(preloaded);
  if (!statusResult.ok) {
    return (
      <Alert variant="danger" className="mb-4">
        Could not check fork updates: {getFailureMessage(statusResult.error)}
      </Alert>
    );
  }
  if (statusResult.value === null) return null;
  const status = statusResult.value;

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
