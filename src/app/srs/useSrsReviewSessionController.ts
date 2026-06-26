"use client";

import {
  useDebugValue,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { reportSlowSrsNavigation } from "@/lib/srsNavigationTelemetry";
import {
  createSrsReviewProgressState,
  getSrsReviewScreenState,
  getSrsActiveCardCount,
  type SrsReviewScreenState,
  type SrsReviewProgressState,
  type SrsReviewProgressAction,
  srsReviewProgressReducer,
} from "./srsReviewWorkflow";
import type {
  ActiveSrsReviewSession,
  SrsReviewItem,
} from "./srsReviewTypes";
import { useLastNonEmptyQueue } from "./useLastNonEmptyQueue";

export type SrsReviewScreenStateWithoutItem = SrsReviewScreenState;

export type SrsReviewSessionData = {
  effectiveQueue: SrsReviewItem[];
  orderedIds: string[];
  workflow: SrsReviewProgressState;
  dispatchWorkflow: React.Dispatch<SrsReviewProgressAction>;
  initialQueueSize: number;
  initialReviewedToday: number;
  stats: ActiveSrsReviewSession["stats"];
};

export type SrsReviewSessionController = {
  state: SrsReviewScreenStateWithoutItem;
  data: SrsReviewSessionData;
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

  const activeCardCount = getSrsActiveCardCount({
    effectiveQueueSize: effectiveQueue.length,
    reviewedCount: workflow.reviewedCount,
    initialQueueSize,
  });

  const state = getSrsReviewScreenState({
    state: workflow,
    activeCardCount,
    initialQueueSize,
    initialReviewedToday,
    serverReviewedToday: stats.reviewedToday,
  });

  useDebugValue({
    screen: state.status,
    queue: queue.length,
    effectiveQueue: effectiveQueue.length,
    activeCards: activeCardCount,
    reviewed: workflow.reviewedCount,
  });

  return {
    state,
    data: {
      effectiveQueue,
      orderedIds,
      workflow,
      dispatchWorkflow,
      initialQueueSize,
      initialReviewedToday,
      stats,
    },
  };
}
