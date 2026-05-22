"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncStatus } from "@/lib/SyncProvider";
import { shouldShowOfflineIndicator } from "@/lib/syncState";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount, visiblePendingCount, isSyncing } = useSyncStatus();

  if (!shouldShowOfflineIndicator({ isOnline, visiblePendingCount })) return null;

  const onlinePendingCount = visiblePendingCount;

  return (
    <div
      className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {!isOnline
        ? pendingCount > 0
          ? `Offline — ${pendingCount} change${pendingCount !== 1 ? "s" : ""} will sync when connected`
          : "Offline — changes will sync when connected"
        : isSyncing
          ? `Syncing ${onlinePendingCount} change${onlinePendingCount !== 1 ? "s" : ""}...`
          : `${onlinePendingCount} change${onlinePendingCount !== 1 ? "s" : ""} pending`}
    </div>
  );
}
