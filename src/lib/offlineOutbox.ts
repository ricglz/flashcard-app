import { getDb, type OutboxEntry, type OutboxStatus } from "./offlineDb";

export type OutboxOutcome =
  | { ok: true; status: "queued"; id: number }
  | { ok: true; status: "replayed"; id: number }
  | { ok: true; status: "duplicate"; id: number }
  | { ok: false; status: "permanentFailure"; id: number; message: string }
  | { ok: false; status: "authRequiredRetry"; id: number; message: string };

export function normalizeSyncFailure(error: unknown): "authRequiredRetry" | "permanentFailure" {
  const message = error instanceof Error ? error.message : String(error);
  if (/auth|sign in|unauthenticated/i.test(message)) return "authRequiredRetry";
  return "permanentFailure";
}

export async function addToOutbox(
  mutationName: string,
  args: unknown
): Promise<OutboxOutcome> {
  try {
    const db = await getDb();
    const id = await db.add("outbox", {
      mutationName,
      args,
      createdAt: Date.now(),
      status: "pending",
      retries: 0,
    } as OutboxEntry);
    window.dispatchEvent(new Event("outbox-changed"));
    return { ok: true, status: "queued", id: id as number };
  } catch (error) {
    return { ok: false, status: "permanentFailure", id: -1, message: error instanceof Error ? error.message : "Failed to queue offline action" };
  }
}

export async function getPendingEntries(): Promise<OutboxEntry[]> {
  try {
    const db = await getDb();
    const all = await db.getAll("outbox");
    return all.filter((e) => e.status !== "failed" || e.retries < 3);
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
    // ignore
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
    // ignore
  }
}

export async function removeEntry(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.delete("outbox", id);
    window.dispatchEvent(new Event("outbox-changed"));
  } catch {
    // ignore
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDb();
    const all = await db.getAll("outbox");
    return all.filter((e) => e.status !== "failed" && e.status !== "auth_required").length;
  } catch {
    return 0;
  }
}
