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

export type CardNavigationMode =
  | { kind: "bounded" }
  | { kind: "session"; serverIndex: number };

export function nextCardIndex(
  index: number,
  total: number,
  mode: CardNavigationMode,
): number {
  const max = mode.kind === "session" ? total : Math.max(0, total - 1);
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
  initialIndex: number;
  mode: CardNavigationMode;
  onCardChange?: () => void;
};

type ResolveNavigationStateOptions<T> = {
  orderedIds: readonly T[];
  hiddenIds: ReadonlySet<T>;
  currentIndex: number;
  mode: CardNavigationMode;
};

export function resolveNavigationState<T>({
  orderedIds,
  hiddenIds,
  currentIndex,
  mode,
}: ResolveNavigationStateOptions<T>) {
  const resolvedIndex =
    mode.kind === "session"
      ? Math.max(currentIndex, mode.serverIndex)
      : currentIndex;
  const activeIds = visibleCardIds(orderedIds, hiddenIds);
  const safeIndex = safeCardIndex(resolvedIndex, activeIds.length);
  const isPastEnd = mode.kind === "session" && resolvedIndex >= activeIds.length;
  const currentId = isPastEnd ? null : (activeIds[safeIndex] ?? null);

  return {
    activeIds,
    currentId,
    currentIndex: resolvedIndex,
    safeIndex,
    isPastEnd,
    canPrevious: safeIndex > 0,
    canNext: safeIndex < activeIds.length - 1,
  };
}

export function useCardNavigation<T>({
  orderedIds,
  initialIndex,
  mode,
  onCardChange,
}: UseCardNavigationOptions<T>) {
  const [currentIndex, setCurrentIndex] = useState(() => initialIndex);
  const [hiddenIds, setHiddenIds] = useState<Set<T>>(new Set());
  const sessionServerIndex = mode.kind === "session" ? mode.serverIndex : null;

  const navigationState = useMemo(
    () =>
      resolveNavigationState({
        orderedIds,
        hiddenIds,
        currentIndex,
        mode,
      }),
    [
      currentIndex,
      hiddenIds,
      mode,
      orderedIds,
    ],
  );

  const reconcileIndex = useCallback(
    (index: number) =>
      sessionServerIndex !== null
        ? Math.max(index, sessionServerIndex)
        : index,
    [sessionServerIndex],
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
      const next = nextCardIndex(
        current,
        navigationState.activeIds.length,
        mode,
      );
      if (next !== current) onCardChange?.();
      return next;
    });
  }, [
    mode,
    navigationState.activeIds.length,
    onCardChange,
    reconcileIndex,
  ]);

  const hideCurrent = useCallback(() => {
    const currentId = navigationState.currentId;
    if (currentId === null) return;
    setHiddenIds((ids) => new Set(ids).add(currentId));
    setCurrentIndex((index) =>
      indexAfterHidingCurrent(
        reconcileIndex(index),
        navigationState.activeIds.length,
      ),
    );
    onCardChange?.();
  }, [navigationState, onCardChange, reconcileIndex]);

  return {
    activeIds: navigationState.activeIds,
    currentId: navigationState.currentId,
    currentIndex: navigationState.currentIndex,
    safeIndex: navigationState.safeIndex,
    hiddenIds,
    isPastEnd: navigationState.isPastEnd,
    canPrevious: navigationState.canPrevious,
    canNext: navigationState.canNext,
    goPrevious,
    goNext,
    advance: goNext,
    hideCurrent,
  };
}
