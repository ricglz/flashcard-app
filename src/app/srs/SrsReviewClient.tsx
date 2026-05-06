"use client";

import { useState, useCallback } from "react";
import { usePreloadedQuery, useMutation, useQuery, Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import {
  CardRating,
  SRS_RATING_LABELS,
  CARD_RATING_SCORES,
  FieldDefinition,
} from "@/lib/types";
import Link from "next/link";

type Props = {
  preloadedQueue: Preloaded<typeof api.srsReviewQueue.getHydratedQueue>;
};

export default function SrsReviewClient({ preloadedQueue }: Props) {
  const router = useRouter();
  const queue = usePreloadedQuery(preloadedQueue);
  const recordReview = useMutation(api.srsReviewQueue.recordReview);
  const stats = useQuery(api.srsReviewQueue.getQueueStats);
  const settings = useQuery(api.userSettings.get);

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<CardRating, number>>({
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const totalCards = queue.length + reviewedCount;
  const currentItem = queue.length > 0 ? queue[0] : null;

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting || !currentItem) return;
      setIsSubmitting(true);

      try {
        await recordReview({
          queueItemId: currentItem._id,
          rating,
        });
        setRevealed(false);
        setReviewedCount((c) => c + 1);
        setRatingCounts((prev) => ({
          ...prev,
          [rating]: prev[rating] + 1,
        }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentItem, isSubmitting, recordReview]
  );

  // Completion screen
  if (!currentItem || queue.length === 0) {
    const totalScore =
      reviewedCount > 0
        ? Object.entries(ratingCounts).reduce(
            (sum, [rating, count]) =>
              sum + CARD_RATING_SCORES[rating as CardRating] * count,
            0
          ) /
          (reviewedCount * 3)
        : 0;

    const totalReviewed = stats?.reviewedToday ?? reviewedCount;

    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-4 sm:px-6 py-4">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            &larr; Dashboard
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-2">All done!</h2>
            <p className="text-muted mb-6">
              You reviewed {totalReviewed} card
              {totalReviewed !== 1 ? "s" : ""} today.
            </p>

            <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
              <p className="text-4xl font-bold mb-1">
                {Math.round(totalScore * 100)}%
              </p>
              <p className="text-sm text-muted">Overall score</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {(
                [
                  ["wrong", "bg-red-600"],
                  ["hard", "bg-orange-500"],
                  ["good", "bg-blue-600"],
                  ["easy", "bg-green-600"],
                ] as const
              ).map(([rating, color]) => (
                <div key={rating} className="text-center">
                  <div
                    className={`${color} text-white text-lg font-bold rounded-lg py-2 mb-1`}
                  >
                    {ratingCounts[rating]}
                  </div>
                  <p className="text-xs text-muted">
                    {SRS_RATING_LABELS[rating]}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/"
              className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const fieldDefs = currentItem.fieldDefinitions as FieldDefinition[];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Dashboard
          </Link>
          <span className="text-sm text-muted">
            {reviewedCount + 1} / {totalCards}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            {ttsEnabled ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              if (confirm("End review session? Your progress is saved.")) {
                router.push("/");
              }
            }}
            className="text-sm text-danger hover:text-danger-hover transition-colors"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(reviewedCount / totalCards) * 100}%`,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <StudyCard
          key={currentItem._id}
          card={currentItem.card}
          fieldDefinitions={fieldDefs}
          frontFields={currentItem.frontFields}
          backFields={currentItem.backFields}
          onRevealed={() => setRevealed(true)}
          autoPlayTts={ttsEnabled}
          ttsRate={settings?.ttsPlaybackSpeed}
        />

        {revealed && (
          <div className="mt-8">
            <p className="text-center text-sm text-muted mb-3">
              How well did you recall this?
            </p>
            <CardRatingButtons
              onRate={handleRate}
              disabled={isSubmitting}
              labels={SRS_RATING_LABELS}
            />
          </div>
        )}
      </main>
    </div>
  );
}
