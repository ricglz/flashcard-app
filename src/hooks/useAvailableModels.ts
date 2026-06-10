"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { LlmModel } from "@/lib/aiModels";

export function useAvailableModels(
  enabled = true,
  initialModels?: readonly LlmModel[],
) {
  const getModels = useAction(api.ai.getAvailableModels);
  const [models, setModels] = useState<LlmModel[]>(() => [...(initialModels ?? [])]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(initialModels !== undefined);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getModels({});
      if (result.ok) setModels(result.value.models);
    } finally {
      setLoading(false);
    }
  }, [getModels]);

  useEffect(() => {
    if (!enabled || hasFetched.current) return;
    hasFetched.current = true;
    void fetchModels();
  }, [enabled, fetchModels]);

  return { models, loading, refetch: fetchModels };
}
