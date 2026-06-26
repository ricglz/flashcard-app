"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function Error({
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
      title="Something went wrong"
      description={error.message || "An unexpected error occurred."}
      onRetry={reset}
      retryLabel="Try again"
      href="/"
      actionLabel="Go to Dashboard"
    />
  );
}
