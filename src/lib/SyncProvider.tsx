"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useConvex } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { FunctionReference } from "convex/server";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getPendingEntries,
  markSyncing,
  markFailed,
  removeEntry,
  getPendingCount,
} from "./offlineOutbox";

interface SyncContextValue {
  pendingCount: number;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextValue>({
  pendingCount: 0,
  isSyncing: false,
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

export default function SyncProvider({ children }: { children: ReactNode }) {
  const client = useConvex();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Listen for outbox changes
  useEffect(() => {
    const handler = () => {
      refreshCount();
    };
    window.addEventListener("outbox-changed", handler);
    return () => window.removeEventListener("outbox-changed", handler);
  }, [refreshCount]);

  // Load initial count on mount
  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  // Drain outbox when coming online
  useEffect(() => {
    if (!isOnline || isSyncing) return;

    let cancelled = false;

    async function drain() {
      const entries = await getPendingEntries();
      if (entries.length === 0 || cancelled) return;

      setIsSyncing(true);

      for (const entry of entries) {
        if (cancelled) break;
        try {
          await markSyncing(entry.id);
          const ref = makeFunctionReference<"mutation">(
            entry.mutationName
          ) as FunctionReference<"mutation">;
          await client.mutation(ref, entry.args as Record<string, unknown>);
          await removeEntry(entry.id);
        } catch {
          await markFailed(entry.id, (entry.retries || 0) + 1);
        }
      }

      if (!cancelled) {
        setIsSyncing(false);
        await refreshCount();
      }
    }

    drain();

    return () => {
      cancelled = true;
    };
  }, [isOnline, isSyncing, client, refreshCount]);

  return (
    <SyncContext.Provider value={{ pendingCount, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}
