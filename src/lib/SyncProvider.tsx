"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useConvex, type ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { FunctionReference } from "convex/server";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getPendingEntries,
  markSyncing,
  markFailed,
  normalizeSyncFailure,
  removeEntry,
  getPendingCount,
} from "./offlineOutbox";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

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

async function flushEntries(client: ConvexReactClient): Promise<boolean> {
  const entries = await getPendingEntries();
  let allSucceeded = true;
  for (const entry of entries) {
    try {
      await markSyncing(entry.id);
      const ref = makeFunctionReference<"mutation">(
        entry.mutationName,
      ) as FunctionReference<"mutation">;
      const result = await client.mutation(ref, entry.args as Record<string, unknown>);
      if (
        result &&
        typeof result === "object" &&
        "ok" in result &&
        result.ok === false
      ) {
        const message = "error" in result && result.error && typeof result.error === "object" && "message" in result.error
          ? String(result.error.message)
          : "Offline action failed";
        await markFailed(entry.id, (entry.retries || 0) + 1, normalizeSyncFailure(new Error(message)));
        allSucceeded = false;
        continue;
      }
      await removeEntry(entry.id);
    } catch (error) {
      await markFailed(entry.id, (entry.retries || 0) + 1, normalizeSyncFailure(error));
      allSucceeded = false;
    }
  }
  return allSucceeded;
}

export default function SyncProvider({ children }: { children: ReactNode }) {
  const client = useConvex();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  useEffect(() => {
    const handler = () => refreshCount();
    window.addEventListener("outbox-changed", handler);
    return () => window.removeEventListener("outbox-changed", handler);
  }, [refreshCount]);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  useEffect(() => {
    if (!isOnline || isSyncing) return;

    let cancelled = false;

    async function drain() {
      if (cancelled || (await getPendingCount()) === 0) return;

      setIsSyncing(true);

      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          if (cancelled) break;
        }
        const success = await flushEntries(client);
        if (success) break;
      }

      if (!cancelled) {
        setIsSyncing(false);
        await refreshCount();
      }
    }

    drain();
    return () => { cancelled = true; };
  }, [isOnline, isSyncing, client, refreshCount]);

  return (
    <SyncContext.Provider value={{ pendingCount, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}
