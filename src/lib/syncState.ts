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
