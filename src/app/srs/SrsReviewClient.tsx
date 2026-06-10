"use client";


import { useState, useCallback, useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import type { CardRating } from "@/lib/types";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import SrsReviewComplete from "./SrsReviewComplete";
import SrsReviewActive from "./SrsReviewActive";
import AssistantPanel from "@/components/AssistantPanel";
import { useTtsControls } from "@/hooks/useTtsControls";
import InlineError from "@/components/InlineError";
import { useForceRefreshQueue } from "@/hooks/useForceRefreshQueue";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";

const SRS_NAV_START_KEY = "srs-nav-start";
const SRS_NAV_SLOW_THRESHOLD_MS = 1500;

function isPwaStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function reportSlowSrsNavigation() {
  const rawStart = window.sessionStorage.getItem(SRS_NAV_START_KEY);
  if (rawStart === null) return;
  window.sessionStorage.removeItem(SRS_NAV_START_KEY);

  const start = Number(rawStart);
  if (!Number.isFinite(start)) return;

  const elapsedMs = performance.now() - start;
  if (elapsedMs <= SRS_NAV_SLOW_THRESHOLD_MS) return;

  Sentry.captureMessage("Slow SRS navigation", {
    level: "warning",
    tags: {
      surface: "srs",
      source: "home_start_review",
    },
    extra: {
      elapsedMs: Math.round(elapsedMs),
      pwaStandalone: isPwaStandalone(),
    },
  });
}

type Props = {
  preloadedSession: Preloaded<typeof api.srsReviewQueue.getReviewSession>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
};

export default function SrsReviewClient({
  preloadedSession,
  preloadedTtsConfig,
}: Props) {
  const router = useRouter();
  const session = useOfflinePreloadedQuery(preloadedSession);
  const queue = session.queue;
  const stats = session.stats;
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview, {
    strategy: "queue-first",
  });
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setNote = useMutation(api.cardAnnotations.setNote);
  const {
    handleLoadMore,
    isLoadingMore,
    noMoreCards,
    error: refreshError,
    clearError: clearRefreshError,
  } = useForceRefreshQueue();
  const tts = useTtsControls(preloadedTtsConfig);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  useEffect(() => {
    reportSlowSrsNavigation();
  }, []);

  const stableQueue = useRef(queue);
  // Keep the last non-empty offline queue visible across transient reconnect empties.
  // eslint-disable-next-line react-hooks/refs
  if (queue.length > 0) stableQueue.current = queue;
  // eslint-disable-next-line react-hooks/refs
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
  const [initialQueueSize] = useState(effectiveQueue.length);
  const [initialReviewedToday] = useState(stats.reviewedToday);

  const navigation = useCardNavigation({
    orderedIds: effectiveQueue.map((item) => item._id),
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });
  const totalCards = navigation.activeIds.length + reviewedCount;
  const currentItem = navigation.currentId
    ? (effectiveQueue.find((item) => item._id === navigation.currentId) ?? null)
    : null;
  const reviewedToday = Math.max(
    stats.reviewedToday,
    initialReviewedToday + reviewedCount,
  );

  const isSessionComplete =
    navigation.activeIds.length === 0 && reviewedCount >= initialQueueSize;

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

  const currentAnnotation = currentItem.annotation;

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
