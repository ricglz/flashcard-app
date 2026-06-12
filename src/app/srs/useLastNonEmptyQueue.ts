"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ActiveSrsReviewSession } from "./srsReviewTypes";

type SrsReviewQueue = ActiveSrsReviewSession["queue"];

function createLastNonEmptyQueueStore(initialQueue: SrsReviewQueue) {
  let snapshot = initialQueue;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (queue: SrsReviewQueue) => {
      if (queue.length === 0 || queue === snapshot) return;
      snapshot = queue;
      for (const listener of listeners) listener();
    },
  };
}

export function useLastNonEmptyQueue(queue: SrsReviewQueue) {
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
