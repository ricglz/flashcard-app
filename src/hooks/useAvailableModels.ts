"use client";

import { useState, useCallback, useEffect, useRef, useContext } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { LlmModel } from "@/lib/aiModels";
import { AvailableModelsContext } from "@/contexts/AvailableModelsContext";

/**
 * @deprecated Use useAvailableModelsContext from @/contexts/AvailableModelsContext instead.
 * This shim remains for backward compatibility during migration.
 */
export function useAvailableModels(
  enabled = true,
  initialModels?: readonly LlmModel[],
) {
  const ctx = useContext(AvailableModelsContext);
  const getModels = useAction(api.ai.getAvailableModels);
  const [models, setModels] = useState<LlmModel[]>(() => [...(initialModels ?? [])]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(initialModels !== undefined || !!ctx);

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
    if (ctx || !enabled || hasFetched.current) return;
    hasFetched.current = true;
    void fetchModels();
  }, [enabled, fetchModels, ctx]);

  if (ctx) {
    return { models: [...ctx.models], loading: false, refetch: async () => {} };
  }

  return { models, loading, refetch: fetchModels };
}
