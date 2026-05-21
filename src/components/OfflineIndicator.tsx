"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncStatus } from "@/lib/SyncProvider";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing } = useSyncStatus();

  if (isOnline && pendingCount === 0) return null;

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
          ? `Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}...`
          : `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending`}
    </div>
  );
}
