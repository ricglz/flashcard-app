"use client";

import { isFailureResult } from "@/lib/appResult";
import { useState, useCallback, useRef } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { CardRating } from "@/lib/types";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflineMutation } from "@/lib/useOfflineMutation";
import SrsReviewComplete from "./SrsReviewComplete";
import SrsReviewActive from "./SrsReviewActive";
import { asId } from "@/lib/convexHelpers";

type Props = {
  preloadedQueue: Preloaded<typeof api.srsReviewQueue.getHydratedQueue>;
};

export default function SrsReviewClient({ preloadedQueue }: Props) {
  const router = useRouter();
  const queue = usePreloadedQuery(preloadedQueue);
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview);
  const forceRefresh = useMutation(api.srsReviewQueue.forceRefreshQueue);
  const stats = useOfflineQuery(api.srsReviewQueue.getQueueStats);
  const settings = useOfflineQuery(api.userSettings.get);
  const updateSettings = useMutation(api.userSettings.update);
  const annotations = useOfflineQuery(api.cardAnnotations.getAll);
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setCardNote = useMutation(api.cardAnnotations.setNote);

  // Snapshot the queue so auth drops don't wipe it
  const stableQueue = useRef(queue);
  if (queue.length > 0) stableQueue.current = queue;
  const effectiveQueue = queue.length > 0 ? queue : stableQueue.current;

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
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noMoreCards, setNoMoreCards] = useState(false);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);
  const initialQueueSize = useRef(effectiveQueue.length);

  const effectiveTtsSpeed = localTtsSpeed ?? settings?.ttsPlaybackSpeed ?? 0.75;

  const annotationMap = new Map(
    (annotations ?? []).map((a) => [a.cardId, { flagged: a.flagged, note: a.note, setId: a.setId }])
  );

  const handleTtsSpeedChange = useCallback(
    (speed: number) => {
      setLocalTtsSpeed(speed);
      void updateSettings({ ttsPlaybackSpeed: speed });
    },
    [updateSettings]
  );

  const visibleQueue = effectiveQueue.filter((item) => !reviewedIds.has(item._id));
  const totalCards = visibleQueue.length + reviewedCount;
  const currentItem = visibleQueue.length > 0 ? visibleQueue[0] : null;

  // Queue dropped to 0 without the user reviewing all cards — auth likely failed
  const isSessionComplete =
    visibleQueue.length === 0 && reviewedCount >= initialQueueSize.current;

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting || !currentItem) return;
      setIsSubmitting(true);

      try {
        const result = await recordReview({
          srsCardId: currentItem.srsCardId,
          rating,
        });
        if (isFailureResult(result)) {
          console.error(result.error.message);
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
    [currentItem, isSubmitting, recordReview]
  );

  async function handleLoadMore() {
    setIsLoadingMore(true);
    setNoMoreCards(false);
    try {
      const result = await forceRefresh();
      if (isFailureResult(result)) {
        console.error(result.error.message);
        return;
      }
      if ((result as { added: number }).added === 0) {
        setNoMoreCards(true);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isSessionComplete) {
    return (
      <SrsReviewComplete
        reviewedCount={reviewedCount}
        ratingCounts={ratingCounts}
        reviewedToday={stats?.reviewedToday ?? reviewedCount}
        onLoadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
        noMoreCards={noMoreCards}
      />
    );
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Reconnecting...</p>
      </div>
    );
  }

  const currentAnnotation = currentItem
    ? annotationMap.get(asId<"flashcards">(currentItem.card._id))
    : undefined;

  return (
    <SrsReviewActive
      currentItem={currentItem}
      reviewedCount={reviewedCount}
      totalCards={totalCards}
      revealed={revealed}
      isSubmitting={isSubmitting}
      ttsEnabled={ttsEnabled}
      ttsRate={effectiveTtsSpeed}
      ttsSpeed={effectiveTtsSpeed}
      onTtsSpeedChange={handleTtsSpeedChange}
      onReveal={() => setRevealed(true)}
      onRate={handleRate}
      onToggleTts={() => setTtsEnabled((v) => !v)}
      annotation={currentAnnotation ? { flagged: currentAnnotation.flagged, note: currentAnnotation.note } : undefined}
      onToggleFlag={() => {
        void toggleFlag({ cardId: asId<"flashcards">(currentItem.card._id), setId: currentItem.setId });
      }}
      onSetNote={(note: string) => {
        void setCardNote({ cardId: asId<"flashcards">(currentItem.card._id), setId: currentItem.setId, note });
      }}
      onEndSession={() => {
        if (confirm("End review session? Your progress is saved.")) {
          router.push("/");
        }
      }}
    />
  );
}
