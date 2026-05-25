"use client";

import { useCallback, useState } from "react";

export type UseReviewCardStateResult = {
  revealed: boolean;
  reveal: () => void;
  resetReveal: () => void;
};

export function useReviewCardState(): UseReviewCardStateResult {
  const [revealed, setRevealed] = useState(false);

  const reveal = useCallback(() => setRevealed(true), []);
  const resetReveal = useCallback(() => setRevealed(false), []);

  return { revealed, reveal, resetReveal };
}
