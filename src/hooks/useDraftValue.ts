"use client";

import { useCallback, useState } from "react";

export function useDraftValue<T>(sourceValue: T) {
  const [draftValue, setDraftValue] = useState<T | null>(null);
  const resetDraft = useCallback(() => setDraftValue(null), []);

  return {
    value: draftValue ?? sourceValue,
    setDraftValue,
    resetDraft,
    hasDraft: draftValue !== null,
  };
}
