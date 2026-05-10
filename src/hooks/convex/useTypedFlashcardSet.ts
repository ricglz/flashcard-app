import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { TypedFlashcardSet } from "@/lib/types";

export function useTypedFlashcardSet(
  preloaded: Preloaded<typeof api.flashcardSets.get>
): TypedFlashcardSet {
  return usePreloadedQuery(preloaded) as TypedFlashcardSet;
}
