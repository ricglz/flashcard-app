"use client";

import {
  useCallback,
  useDebugValue,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { CardRating } from "@/lib/types";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { reportSlowSrsNavigation } from "@/lib/srsNavigationTelemetry";
import {
  createSrsReviewProgressState,
  getSrsReviewScreenState,
  type SrsReviewScreenState,
  srsReviewProgressReducer,
} from "./srsReviewWorkflow";
import type {
  ActiveSrsReviewSession,
  SrsReviewItem,
} from "./srsReviewTypes";
import { useLastNonEmptyQueue } from "./useLastNonEmptyQueue";

export type SrsReviewSessionController = {
  screenState: SrsReviewScreenState<SrsReviewItem>;
  onReviewRecorded: (rating: CardRating) => void;
};

export function useSrsReviewSessionController(
  session: ActiveSrsReviewSession,
): SrsReviewSessionController {
  const queue = session.queue;
  const stats = session.stats;

  useEffect(() => {
    reportSlowSrsNavigation();
  }, []);

  const effectiveQueue = useLastNonEmptyQueue(queue);
  const orderedIds = useMemo(
    () => effectiveQueue.map((item) => item._id),
    [effectiveQueue],
  );

  const [workflow, dispatchWorkflow] = useReducer(
    srsReviewProgressReducer,
    createSrsReviewProgressState(),
  );
  const [initialQueueSize] = useState(effectiveQueue.length);
  const [initialReviewedToday] = useState(stats.reviewedToday);

  const navigation = useCardNavigation({
    orderedIds,
    initialIndex: 0,
    mode: { kind: "bounded" },
  });
  const currentItem = useMemo(
    () =>
      navigation.currentId
        ? (effectiveQueue.find((item) => item._id === navigation.currentId) ??
          null)
        : null,
    [effectiveQueue, navigation.currentId],
  );
  const screenState = getSrsReviewScreenState({
    state: workflow,
    activeCardCount: navigation.activeIds.length,
    currentItem,
    initialQueueSize,
    initialReviewedToday,
    serverReviewedToday: stats.reviewedToday,
  });

  useDebugValue({
    screen: screenState.status,
    queue: queue.length,
    effectiveQueue: effectiveQueue.length,
    activeCards: navigation.activeIds.length,
    reviewed: workflow.reviewedCount,
  });

  const onReviewRecorded = useCallback(
    (rating: CardRating) => {
      dispatchWorkflow({ type: "reviewRecorded", rating });
      navigation.hideCurrent();
    },
    [navigation],
  );

  return {
    screenState,
    onReviewRecorded,
  };
}
