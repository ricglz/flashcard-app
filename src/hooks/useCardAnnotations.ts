"use client";

import { useCallback, useMemo, useState } from "react";
import type { Preloaded } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useOfflineMutation } from "./useOfflineMutation";

type Annotation = { cardId: Id<"flashcards">; flagged: boolean; note?: string };
type AnnotationValue = { flagged: boolean; note?: string };
type AnnotationMutationArgs = {
  cardId: Id<"flashcards">;
  setId: Id<"flashcardSets">;
};

function normalizeNote(note: string): string | undefined {
  const trimmed = note.trim();
  return trimmed || undefined;
}

function useCardAnnotationsInternal(annotations: Annotation[] | undefined) {
  const toggleFlagMutation = useOfflineMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useOfflineMutation(api.cardAnnotations.setNote);
  const [optimisticAnnotations, setOptimisticAnnotations] = useState(
    () => new Map<Id<"flashcards">, AnnotationValue>(),
  );

  const baseAnnotationMap = useMemo(
    (): Map<Id<"flashcards">, AnnotationValue> =>
      new Map(
        (annotations ?? []).map((a) => [
          a.cardId,
          { flagged: a.flagged, note: a.note },
        ]),
      ),
    [annotations],
  );

  const annotationMap = useMemo(() => {
    const merged = new Map(baseAnnotationMap);
    for (const [cardId, annotation] of optimisticAnnotations) {
      merged.set(cardId, annotation);
    }
    return merged;
  }, [baseAnnotationMap, optimisticAnnotations]);

  const toggleFlag = useCallback(
    async (args: AnnotationMutationArgs) => {
      setOptimisticAnnotations((previous) => {
        const current = previous.get(args.cardId) ??
          baseAnnotationMap.get(args.cardId) ??
          { flagged: false };
        const next = new Map(previous);
        next.set(args.cardId, {
          flagged: !current.flagged,
          note: current.note,
        });
        return next;
      });
      return toggleFlagMutation(args);
    },
    [baseAnnotationMap, toggleFlagMutation],
  );

  const setNote = useCallback(
    async (args: AnnotationMutationArgs & { note: string }) => {
      setOptimisticAnnotations((previous) => {
        const current = previous.get(args.cardId) ??
          baseAnnotationMap.get(args.cardId) ??
          { flagged: false };
        const next = new Map(previous);
        next.set(args.cardId, {
          flagged: current.flagged,
          note: normalizeNote(args.note),
        });
        return next;
      });
      return setNoteMutation(args);
    },
    [baseAnnotationMap, setNoteMutation],
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
