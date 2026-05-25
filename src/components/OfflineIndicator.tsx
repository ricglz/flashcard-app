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
          ? "bg-info-surface text-info"
          : "bg-warning-surface text-warning"
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
