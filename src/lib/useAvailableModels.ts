"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

type LlmModel = { id: string; name: string };

export function useAvailableModels(enabled = true) {
  const getModels = useAction(api.ai.getAvailableModels);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    getModels({}).then((result) => {
      if (cancelled) return;
      if (result.ok) setModels(result.models);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [enabled, getModels]);

  return { models, loading };
}
