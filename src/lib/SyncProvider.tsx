"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConvex, type ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { FunctionReference } from "convex/server";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";
import {
  getPendingEntries,
  markSyncing,
  markFailed,
  normalizeSyncFailure,
  removeEntry,
  getPendingCount,
} from "./offlineOutbox";
import { shouldDrainOutbox } from "./syncState";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

type SyncContextValue = {
  pendingCount: number;
  isSyncing: boolean;
};

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
    } catch (err) {
      await markFailed(entry.id, (entry.retries || 0) + 1, normalizeSyncFailure(err));
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
  const isSyncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  const drainOutbox = useCallback(async () => {
    const count = await getPendingCount();
    if (
      !shouldDrainOutbox({
        isOnline,
        isSyncing: isSyncingRef.current,
        pendingCount: count,
      })
    ) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      let success = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
        success = await flushEntries(client);
        if (success) break;
      }

      if (!success) {
        toast.error("Failed to sync some changes. They'll retry next time you're online.");
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }
  }, [isOnline, client, refreshCount]);

  useEffect(() => {
    const handler = () => {
      void refreshCount();
      void drainOutbox();
    };
    window.addEventListener("outbox-changed", handler);
    return () => window.removeEventListener("outbox-changed", handler);
  }, [refreshCount, drainOutbox]);

  useEffect(() => {
    void getPendingCount().then(setPendingCount);
  }, []);

  useEffect(() => {
    void drainOutbox();
  }, [drainOutbox]);

  return (
    <SyncContext.Provider value={{ pendingCount, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}
