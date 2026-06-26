"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { ErrorState } from "@/components/ui/ErrorState";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ setId: string }>();

  useEffect(() => {
    Sentry.captureException(error);
    console.error("Study session error boundary caught an error", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      setId: params.setId,
    });
  }, [error, params.setId]);

  return (
    <ErrorState
      title="Study session error"
      description="Something went wrong during your study session."
      onRetry={reset}
      retryLabel="Try again"
      href={`/sets/${params.setId}`}
      actionLabel="Back to set"
    />
  );
}
