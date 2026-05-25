"use client";

import { useCallback, useMemo, useState } from "react";

export function visibleCardIds<T>(
  orderedIds: readonly T[],
  hiddenIds: ReadonlySet<T>,
): T[] {
  return orderedIds.filter((id) => !hiddenIds.has(id));
}

export function safeCardIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(0, index), total - 1);
}

export function nextCardIndex(index: number, total: number, allowPastEnd = false): number {
  const max = allowPastEnd ? total : Math.max(0, total - 1);
  return Math.min(index + 1, max);
}

export function previousCardIndex(index: number): number {
  return Math.max(0, index - 1);
}

export function indexAfterHidingCurrent(index: number, totalBeforeHide: number): number {
  const totalAfterHide = Math.max(0, totalBeforeHide - 1);
  if (totalAfterHide === 0) return 0;
  return Math.min(index, totalAfterHide - 1);
}

type UseCardNavigationOptions<T> = {
  orderedIds: readonly T[];
  initialIndex?: number;
  allowPastEnd?: boolean;
  serverIndex?: number;
  reconcileServerIndex?: boolean;
  onCardChange?: () => void;
};

export function useCardNavigation<T>({
  orderedIds,
  initialIndex = 0,
  allowPastEnd = false,
  serverIndex,
  reconcileServerIndex = false,
  onCardChange,
}: UseCardNavigationOptions<T>) {
  const [currentIndex, setCurrentIndex] = useState(() => initialIndex);
  const [hiddenIds, setHiddenIds] = useState<Set<T>>(new Set());
  const resolvedIndex =
    reconcileServerIndex && serverIndex !== undefined
      ? Math.max(currentIndex, serverIndex)
      : currentIndex;

  const activeIds = useMemo(
    () => visibleCardIds(orderedIds, hiddenIds),
    [hiddenIds, orderedIds],
  );
  const safeIndex = safeCardIndex(resolvedIndex, activeIds.length);
  const currentId =
    allowPastEnd && resolvedIndex >= activeIds.length
      ? null
      : (activeIds[safeIndex] ?? null);
  const isPastEnd = allowPastEnd && resolvedIndex >= activeIds.length;

  const reconcileIndex = useCallback(
    (index: number) =>
      reconcileServerIndex && serverIndex !== undefined
        ? Math.max(index, serverIndex)
        : index,
    [reconcileServerIndex, serverIndex],
  );

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => {
      const current = reconcileIndex(index);
      const next = previousCardIndex(current);
      if (next !== current) onCardChange?.();
      return next;
    });
  }, [onCardChange, reconcileIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((index) => {
      const current = reconcileIndex(index);
      const next = nextCardIndex(current, activeIds.length, allowPastEnd);
      if (next !== current) onCardChange?.();
      return next;
    });
  }, [activeIds.length, allowPastEnd, onCardChange, reconcileIndex]);

  const hideCurrent = useCallback(() => {
    if (currentId === null) return;
    setHiddenIds((ids) => new Set(ids).add(currentId));
    setCurrentIndex((index) => indexAfterHidingCurrent(reconcileIndex(index), activeIds.length));
    onCardChange?.();
  }, [activeIds.length, currentId, onCardChange, reconcileIndex]);

  return {
    activeIds,
    currentId,
    currentIndex: resolvedIndex,
    safeIndex,
    hiddenIds,
    isPastEnd,
    canPrevious: safeIndex > 0,
    canNext: safeIndex < activeIds.length - 1,
    goPrevious,
    goNext,
    advance: goNext,
    hideCurrent,
  };
}
