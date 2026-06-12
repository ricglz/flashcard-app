"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import FlashcardSetListInner from "./FlashcardSetListInner";

export default function FlashcardSetList({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.flashcardSets.list>;
}) {
  const setsResult = useOfflinePreloadedQuery(preloaded);
  if (!setsResult.ok) return null;
  return <FlashcardSetListInner sets={setsResult.value} />;
}
