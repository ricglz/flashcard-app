"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold">Study session error</h1>
        <p className="text-sm text-muted">
          Something went wrong during your study session.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
          >
            Try again
          </button>
          <Link
            href={`/sets/${params.setId}`}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Back to set
          </Link>
        </div>
      </div>
    </div>
  );
}
