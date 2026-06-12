"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import SrsReviewClientInner from "./SrsReviewClientInner";

type Props = {
  preloadedSession: Preloaded<typeof api.srsReviewQueue.getReviewSession>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
};

export default function SrsReviewClient({
  preloadedSession,
  preloadedTtsConfig,
}: Props) {
  const sessionResult = useOfflinePreloadedQuery(preloadedSession);
  if (!sessionResult.ok) return null;
  return (
    <SrsReviewClientInner
      session={sessionResult.value}
      preloadedTtsConfig={preloadedTtsConfig}
    />
  );
}
