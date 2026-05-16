"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

type LlmModel = { id: string; name: string };

export function useAvailableModels(enabled = true) {
  const getModels = useAction(api.ai.getAvailableModels);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getModels({});
      if (result.ok) setModels(result.models);
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
