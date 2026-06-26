"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function SrsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorState
      title="Review session error"
      description="Something went wrong during your SRS review."
      onRetry={reset}
      retryLabel="Try again"
      href="/"
      actionLabel="Return to Dashboard"
    />
  );
}
