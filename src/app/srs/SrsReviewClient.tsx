"use client";


import { useState, useCallback, useRef } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import type { CardRating } from "@/lib/types";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import SrsReviewComplete from "./SrsReviewComplete";
import SrsReviewActive from "./SrsReviewActive";
import AssistantPanel from "@/components/AssistantPanel";
import { asId } from "@/lib/convexHelpers";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsAllPreloaded } from "@/hooks/useCardAnnotations";
import InlineError from "@/components/InlineError";
import { useForceRefreshQueue } from "@/hooks/useForceRefreshQueue";

type Props = {
  preloadedQueue: Preloaded<typeof api.srsReviewQueue.getHydratedQueue>;
  preloadedStats: Preloaded<typeof api.srsReviewQueue.getQueueStats>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getAll>;
};

export default function SrsReviewClient({
  preloadedQueue,
  preloadedStats,
  preloadedTtsConfig,
  preloadedAnnotations,
}: Props) {
  const router = useRouter();
  const queue = usePreloadedQuery(preloadedQueue);
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview, {
    strategy: "queue-first",
  });
  const {
    handleLoadMore,
    isLoadingMore,
    noMoreCards,
    error: refreshError,
    clearError: clearRefreshError,
  } = useForceRefreshQueue();
  const stats = useOfflinePreloadedQuery(preloadedStats);
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } = useCardAnnotationsAllPreloaded(preloadedAnnotations);

  const stableQueue = useRef(queue);
  if (queue.length > 0) stableQueue.current = queue;
  const effectiveQueue = queue.length > 0 ? queue : stableQueue.current;

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<CardRating, number>>({
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const displayError = error ?? refreshError;
  const initialQueueSize = useRef(effectiveQueue.length);
  const initialReviewedToday = useRef<number | null>(null);
  if (initialReviewedToday.current === null && stats) {
    initialReviewedToday.current = stats.reviewedToday;
  }

  const visibleQueue = effectiveQueue.filter((item) => !reviewedIds.has(item._id));
  const totalCards = visibleQueue.length + reviewedCount;
  const currentItem = visibleQueue.length > 0 ? visibleQueue[0] : null;
  const reviewedToday = Math.max(
    stats?.reviewedToday ?? 0,
    (initialReviewedToday.current ?? stats?.reviewedToday ?? 0) + reviewedCount,
  );

  const isSessionComplete =
    visibleQueue.length === 0 && reviewedCount >= initialQueueSize.current;

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting || !currentItem) return;
      setIsSubmitting(true);
      setError(null);
      clearRefreshError();

      try {
        const result = await recordReview({
          srsCardId: currentItem.srsCardId,
          rating,
        });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setRevealed(false);
        setReviewedCount((c) => c + 1);
        setRatingCounts((prev) => ({
          ...prev,
          [rating]: prev[rating] + 1,
        }));
        setReviewedIds((prev) => new Set(prev).add(currentItem._id));
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearRefreshError, currentItem, isSubmitting, recordReview],
  );

  if (isSessionComplete) {
    return (
      <>
        <InlineError message={displayError} />
        <SrsReviewComplete
          reviewedCount={reviewedCount}
          ratingCounts={ratingCounts}
          reviewedToday={reviewedToday}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          noMoreCards={noMoreCards}
        />
      </>
    );
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <InlineError message={displayError} />
        <p className="text-muted">Reconnecting...</p>
      </div>
    );
  }

  const currentAnnotation = annotationMap.get(asId<"flashcards">(currentItem.card._id));

  return (
    <>
      <InlineError message={displayError} />
      <SrsReviewActive
        currentItem={currentItem}
        reviewedCount={reviewedCount}
        totalCards={totalCards}
        revealed={revealed}
        isSubmitting={isSubmitting}
        tts={tts}
        onReveal={() => setRevealed(true)}
        onRate={handleRate}
        annotation={currentAnnotation ? { flagged: currentAnnotation.flagged, note: currentAnnotation.note } : undefined}
        onToggleFlag={() => {
          void toggleFlag({ cardId: asId<"flashcards">(currentItem.card._id), setId: currentItem.setId });
        }}
        onSetNote={(note: string) => {
          void setNote({ cardId: asId<"flashcards">(currentItem.card._id), setId: currentItem.setId, note });
        }}
        onEndSession={() => {
          if (confirm("End review session? Your progress is saved.")) {
            router.push("/");
          }
        }}
        assistant={
          <AssistantPanel
            context={{
              setId: asId<"flashcardSets">(currentItem.setId),
              setName: currentItem.setName,
              cardFields: currentItem.card.fields,
            }}
          />
        }
      />
    </>
  );
}
