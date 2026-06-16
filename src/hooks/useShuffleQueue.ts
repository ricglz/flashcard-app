"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getFailureMessage } from "@/lib/domainResultMessage";

export function useShuffleQueue() {
  const shuffleQueue = useMutation(api.srsReviewQueue.shuffleQueue);
  const [isShuffling, setIsShuffling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleShuffle = useCallback(async () => {
    setIsShuffling(true);
    setError(null);
    try {
      const result = await shuffleQueue();
      if (!result.ok) {
        setError(getFailureMessage(result.error));
        return;
      }
    } finally {
      setIsShuffling(false);
    }
  }, [shuffleQueue]);

  return { handleShuffle, isShuffling, error, clearError };
}
