import { getDb, type OutboxEntry, type OutboxStatus } from "./offlineDb";
import {
  decodeOutboxEntry,
  type OfflineMutationName,
  type OutboxArgs,
  type RegisteredOutboxEntry,
} from "./offlineMutationRegistry";

export type OutboxOutcome =
  | { ok: true; status: "queued"; id: number }
  | { ok: true; status: "replayed"; id: number }
  | { ok: true; status: "duplicate"; id: number }
  | { ok: false; status: "permanentFailure"; id: number; message: string }
  | { ok: false; status: "authRequiredRetry"; id: number; message: string };

type AddToOutboxOptions = {
  queuedWhileOnline?: boolean;
};

export function normalizeSyncFailure(err: unknown): "authRequiredRetry" | "permanentFailure" {
  const message = err instanceof Error ? err.message : String(err);
  if (/auth|sign in|unauthenticated/i.test(message)) return "authRequiredRetry";
  return "permanentFailure";
}

function isPendingForCount(entry: OutboxEntry): boolean {
  return entry.status !== "failed" && entry.status !== "auth_required";
}

function isUserVisibleEntry(entry: OutboxEntry): boolean {
  return entry.queuedWhileOnline !== true;
}

export async function addToOutbox<Name extends OfflineMutationName>(
  mutationName: Name,
  args: OutboxArgs<Name>,
  options: AddToOutboxOptions = {},
): Promise<OutboxOutcome> {
  try {
    const db = await getDb();
    const id = await db.add("outbox", {
      mutationName,
      args,
      createdAt: Date.now(),
      status: "pending",
      retries: 0,
      queuedWhileOnline: options.queuedWhileOnline,
    });
    window.dispatchEvent(new Event("outbox-changed"));
    return { ok: true, status: "queued", id };
  } catch (err) {
    return { ok: false, status: "permanentFailure", id: -1, message: err instanceof Error ? err.message : "Failed to queue offline action" };
  }
}

export async function getPendingEntries(): Promise<RegisteredOutboxEntry[]> {
  try {
    const db = await getDb();
    const all = await db.getAll("outbox");
    const entries: RegisteredOutboxEntry[] = [];
    for (const entry of all.filter((e) => e.status !== "failed" || e.retries < 3)) {
      if (typeof entry.id !== "number") continue;
      const decoded = decodeOutboxEntry({ ...entry, id: entry.id });
      if (decoded) {
        entries.push(decoded);
      } else {
        console.warn("[offline] Dropping invalid outbox entry", {
          id: entry.id,
          mutationName: entry.mutationName,
        });
        await markFailed(entry.id, 3, "permanentFailure");
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export async function markSyncing(id: number): Promise<void> {
  try {
    const db = await getDb();
    const entry = await db.get("outbox", id);
    if (entry) await db.put("outbox", { ...entry, status: "syncing" });
  } catch {
    return;
  }
}

export async function markFailed(
  id: number,
  retries: number,
  category: "authRequiredRetry" | "permanentFailure" = "permanentFailure"
): Promise<void> {
  try {
    const db = await getDb();
    const entry = await db.get("outbox", id);
    if (entry) {
      const status: OutboxStatus = category === "authRequiredRetry" ? "auth_required" : retries >= 3 ? "failed" : "pending";
      await db.put("outbox", { ...entry, status, retries });
      window.dispatchEvent(new Event("outbox-changed"));
    }
  } catch {
    return;
  }
}

export async function removeEntry(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.delete("outbox", id);
    window.dispatchEvent(new Event("outbox-changed"));
  } catch {
    return;
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDb();
    const all = await db.getAll("outbox");
    return all.filter(isPendingForCount).length;
  } catch {
    return 0;
  }
}

export async function getVisiblePendingCount(): Promise<number> {
  try {
    const db = await getDb();
    const all = await db.getAll("outbox");
    return all.filter((entry) => isPendingForCount(entry) && isUserVisibleEntry(entry)).length;
  } catch {
    return 0;
  }
}
