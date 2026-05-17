"use client";

import { useQuery, usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { deriveAiAvailability } from "@/lib/aiAvailability";
import type { AiAvailability } from "@/lib/aiAvailability";

export function useAiAvailableFrom(
  queryResult: { hasLlmKey: boolean } | null | undefined,
): AiAvailability {
  const isOnline = useOnlineStatus();
  return deriveAiAvailability(isOnline, queryResult);
}

export function useAiAvailable(): AiAvailability {
  const queryResult = useQuery(api.userSettings.hasLlmKey);
  return useAiAvailableFrom(queryResult);
}

export function useAiAvailablePreloaded(
  preloaded: Preloaded<typeof api.userSettings.hasLlmKey>,
): AiAvailability {
  const queryResult = usePreloadedQuery(preloaded);
  return useAiAvailableFrom(queryResult);
}
