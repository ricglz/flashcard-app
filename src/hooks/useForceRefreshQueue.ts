"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useForceRefreshQueue() {
  const forceRefresh = useMutation(api.srsReviewQueue.forceRefreshQueue);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noMoreCards, setNoMoreCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
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
  }, [forceRefresh]);

  return { handleLoadMore, isLoadingMore, noMoreCards, error, clearError };
}
