"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import * as Sentry from "@sentry/nextjs";
import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { CardRating } from "@/lib/types";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import {
  createSrsReviewWorkflowState,
  getSrsReviewScreenState,
  srsReviewWorkflowReducer,
} from "./srsReviewWorkflow";
import SrsReviewScreen from "./SrsReviewScreen";

const SRS_NAV_START_KEY = "srs-nav-start";
const SRS_NAV_SLOW_THRESHOLD_MS = 1500;

type SrsReviewSession = Extract<
  FunctionReturnType<typeof api.srsReviewQueue.getReviewSession>,
  { ok: true }
>["value"];

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

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

function createLastNonEmptyQueueStore(initialQueue: SrsReviewSession["queue"]) {
  let snapshot = initialQueue;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (queue: SrsReviewSession["queue"]) => {
      if (queue.length === 0 || queue === snapshot) return;
      snapshot = queue;
      for (const listener of listeners) listener();
    },
  };
}

function useLastNonEmptyQueue(queue: SrsReviewSession["queue"]) {
  const [store] = useState(() => createLastNonEmptyQueueStore(queue));
  const lastNonEmptyQueue = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  useEffect(() => {
    store.update(queue);
  }, [queue, store]);

  return queue.length > 0 ? queue : lastNonEmptyQueue;
}

export default function SrsReviewClientInner({
  session,
  preloadedTtsConfig,
}: {
  session: SrsReviewSession;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
}) {
  const queue = session.queue;
  const stats = session.stats;
  const recordReview = useOfflineMutation(api.srsReviewQueue.recordReview, {
    strategy: "queue-first",
  });
  const forceRefreshQueue = useMutation(api.srsReviewQueue.forceRefreshQueue);
  const tts = useTtsControls(preloadedTtsConfig);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  useEffect(() => {
    reportSlowSrsNavigation();
  }, []);

  const effectiveQueue = useLastNonEmptyQueue(queue);

  const [workflow, dispatchWorkflow] = useReducer(
    srsReviewWorkflowReducer,
    createSrsReviewWorkflowState(),
  );
  const [initialQueueSize] = useState(effectiveQueue.length);
  const [initialReviewedToday] = useState(stats.reviewedToday);

  const navigation = useCardNavigation({
    orderedIds: effectiveQueue.map((item) => item._id),
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });
  const screenState = getSrsReviewScreenState({
    state: workflow,
    activeCardCount: navigation.activeIds.length,
    initialQueueSize,
    initialReviewedToday,
    serverReviewedToday: stats.reviewedToday,
  });
  const currentItem = navigation.currentId
    ? (effectiveQueue.find((item) => item._id === navigation.currentId) ?? null)
    : null;

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (workflow.ratingRequest.status === "submitting" || !currentItem) return;
      dispatchWorkflow({ type: "ratingStarted" });

      const result = await recordReview({
        srsCardId: currentItem.srsCardId,
        rating,
      }).catch((error: unknown) => ({
        ok: false as const,
        error: {
          message: mutationErrorMessage(
            error,
            "Could not record review. Try again.",
          ),
        },
      }));
      if (!result.ok) {
        dispatchWorkflow({ type: "ratingFailed", message: result.error.message });
        return;
      }
      dispatchWorkflow({ type: "ratingSucceeded", rating });
      navigation.hideCurrent();
    },
    [currentItem, navigation, recordReview, workflow.ratingRequest.status],
  );

  const handleLoadMore = useCallback(async () => {
    dispatchWorkflow({ type: "loadMoreStarted" });
    const result = await forceRefreshQueue().catch((error: unknown) => ({
      ok: false as const,
      error: {
        message: mutationErrorMessage(
          error,
          "Could not load more cards. Try again.",
        ),
      },
    }));
    if (!result.ok) {
      dispatchWorkflow({ type: "loadMoreFailed", message: result.error.message });
      return;
    }
    dispatchWorkflow({ type: "loadMoreSucceeded", added: result.value.added });
  }, [forceRefreshQueue]);

  return (
    <SrsReviewScreen
      screenState={screenState}
      currentItem={currentItem}
      revealed={revealed}
      tts={tts}
      onReveal={reveal}
      onRate={handleRate}
      onLoadMore={handleLoadMore}
    />
  );
}
