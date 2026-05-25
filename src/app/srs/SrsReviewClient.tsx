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
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsAllPreloaded } from "@/hooks/useCardAnnotations";
import InlineError from "@/components/InlineError";
import { useForceRefreshQueue } from "@/hooks/useForceRefreshQueue";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";

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
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const stableQueue = useRef(queue);
  if (queue.length > 0) stableQueue.current = queue;
  const effectiveQueue = queue.length > 0 ? queue : stableQueue.current;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<CardRating, number>>({
    wrong: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const displayError = error ?? refreshError;
  const initialQueueSize = useRef(effectiveQueue.length);
  const initialReviewedToday = useRef<number | null>(null);
  if (initialReviewedToday.current === null && stats) {
    initialReviewedToday.current = stats.reviewedToday;
  }

  const navigation = useCardNavigation({
    orderedIds: effectiveQueue.map((item) => item._id),
    onCardChange: resetReveal,
  });
  const totalCards = navigation.activeIds.length + reviewedCount;
  const currentItem = navigation.currentId
    ? (effectiveQueue.find((item) => item._id === navigation.currentId) ?? null)
    : null;
  const reviewedToday = Math.max(
    stats?.reviewedToday ?? 0,
    (initialReviewedToday.current ?? stats?.reviewedToday ?? 0) + reviewedCount,
  );

  const isSessionComplete =
    navigation.activeIds.length === 0 && reviewedCount >= initialQueueSize.current;

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
        setReviewedCount((c) => c + 1);
        setRatingCounts((prev) => ({
          ...prev,
          [rating]: prev[rating] + 1,
        }));
        navigation.hideCurrent();
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearRefreshError, currentItem, isSubmitting, navigation, recordReview],
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

  const currentAnnotation = annotationMap.get(currentItem.card._id);

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
        onReveal={reveal}
        onRate={handleRate}
        annotation={currentAnnotation ? { flagged: currentAnnotation.flagged, note: currentAnnotation.note } : undefined}
        onToggleFlag={() => {
          void toggleFlag({ cardId: currentItem.card._id, setId: currentItem.setId });
        }}
        onSetNote={(note: string) => {
          void setNote({ cardId: currentItem.card._id, setId: currentItem.setId, note });
        }}
        onEndSession={() => {
          if (confirm("End review session? Your progress is saved.")) {
            router.push("/");
          }
        }}
        assistant={
          <AssistantPanel
            context={{
              setId: currentItem.setId,
              cardId: currentItem.card._id,
              setName: currentItem.setName,
              cardFields: currentItem.card.fields,
              hasNote: Boolean(currentAnnotation?.note?.trim()),
            }}
          />
        }
      />
    </>
  );
}
