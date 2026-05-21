"use client";


import { useState, useCallback, useRef } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation } from "convex/react";
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
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview);
  const forceRefresh = useMutation(api.srsReviewQueue.forceRefreshQueue);
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noMoreCards, setNoMoreCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialQueueSize = useRef(effectiveQueue.length);

  const visibleQueue = effectiveQueue.filter((item) => !reviewedIds.has(item._id));
  const totalCards = visibleQueue.length + reviewedCount;
  const currentItem = visibleQueue.length > 0 ? visibleQueue[0] : null;

  const isSessionComplete =
    visibleQueue.length === 0 && reviewedCount >= initialQueueSize.current;

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting || !currentItem) return;
      setIsSubmitting(true);
      setError(null);

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
    [currentItem, isSubmitting, recordReview],
  );

  async function handleLoadMore() {
    setIsLoadingMore(true);
    setNoMoreCards(false);
    setError(null);
    try {
      const result = await forceRefresh();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.value.added === 0) {
        setNoMoreCards(true);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isSessionComplete) {
    return (
      <>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
        <SrsReviewComplete
          reviewedCount={reviewedCount}
          ratingCounts={ratingCounts}
          reviewedToday={stats?.reviewedToday ?? reviewedCount}
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
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
        <p className="text-muted">Reconnecting...</p>
      </div>
    );
  }

  const currentAnnotation = annotationMap.get(asId<"flashcards">(currentItem.card._id));

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}
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
