export function shouldDrainOutbox({
  isOnline,
  isSyncing,
  pendingCount,
}: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}) {
  return isOnline && !isSyncing && pendingCount > 0;
}

export function shouldShowOfflineIndicator({
  isOnline,
  visiblePendingCount,
}: {
  isOnline: boolean;
  visiblePendingCount: number;
}) {
  return !isOnline || visiblePendingCount > 0;
}
