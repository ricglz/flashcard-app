"use client";

import { useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useOfflineQuery } from "@/lib/useOfflineQuery";

export function useCardAnnotations(setId?: Id<"flashcardSets">) {
  const allAnnotations = useOfflineQuery(
    api.cardAnnotations.getAll,
    setId ? "skip" : undefined,
  );
  const setAnnotations = useOfflineQuery(
    api.cardAnnotations.getForSet,
    setId ? { setId } : "skip",
  );

  const annotations = setId ? setAnnotations : allAnnotations;
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setNote = useMutation(api.cardAnnotations.setNote);

  const annotationMap = useMemo(
    () =>
      new Map(
        (annotations ?? []).map((a) => [
          a.cardId,
          { flagged: a.flagged, note: a.note },
        ]),
      ),
    [annotations],
  );

  return { annotationMap, toggleFlag, setNote };
}
