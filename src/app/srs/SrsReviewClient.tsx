"use client";

import { useState, useCallback } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { CardRating } from "@/lib/types";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflineMutation } from "@/lib/useOfflineMutation";
import SrsReviewComplete from "./SrsReviewComplete";
import SrsReviewActive from "./SrsReviewActive";

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

  const visibleQueue = queue.filter((item) => !reviewedIds.has(item._id));
  const totalCards = visibleQueue.length + reviewedCount;
  const currentItem = visibleQueue.length > 0 ? visibleQueue[0] : null;

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
      if (result.added === 0) {
        setNoMoreCards(true);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (!currentItem || visibleQueue.length === 0) {
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

  return (
    <SrsReviewActive
      currentItem={currentItem}
      reviewedCount={reviewedCount}
      totalCards={totalCards}
      revealed={revealed}
      isSubmitting={isSubmitting}
      ttsEnabled={ttsEnabled}
      ttsRate={settings?.ttsPlaybackSpeed}
      onReveal={() => setRevealed(true)}
      onRate={handleRate}
      onToggleTts={() => setTtsEnabled((v) => !v)}
      onEndSession={() => {
        if (confirm("End review session? Your progress is saved.")) {
          router.push("/");
        }
      }}
    />
  );
}
