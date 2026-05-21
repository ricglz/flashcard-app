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
  const sets = useOfflinePreloadedQuery(preloaded);
  return <FlashcardSetListInner sets={sets} />;
}
