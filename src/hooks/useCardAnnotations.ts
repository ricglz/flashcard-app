"use client";

import { useMemo } from "react";
import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";

type Annotation = { cardId: Id<"flashcards">; flagged: boolean; note?: string };

function useCardAnnotationsInternal(annotations: Annotation[] | undefined) {
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

export function useCardAnnotationsForSetPreloaded(
  preloaded: Preloaded<typeof api.cardAnnotations.getForSet>,
) {
  const annotations = useOfflinePreloadedQuery(preloaded);
  return useCardAnnotationsInternal(annotations);
}

export function useCardAnnotationsAllPreloaded(
  preloaded: Preloaded<typeof api.cardAnnotations.getAll>,
) {
  const annotations = useOfflinePreloadedQuery(preloaded);
  return useCardAnnotationsInternal(annotations);
}
