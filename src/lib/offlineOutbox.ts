import { getDb, type OutboxEntry } from "./offlineDb";

export async function addToOutbox(
  mutationName: string,
  args: unknown
): Promise<number> {
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
    return id as number;
  } catch {
    return -1;
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
    if (entry) {
      await db.put("outbox", { ...entry, status: "syncing" });
    }
  } catch {
    // ignore
  }
}

export async function markFailed(
  id: number,
  retries: number
): Promise<void> {
  try {
    const db = await getDb();
    const entry = await db.get("outbox", id);
    if (entry) {
      await db.put("outbox", {
        ...entry,
        status: retries >= 3 ? "failed" : "pending",
        retries,
      });
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
    return all.filter((e) => e.status !== "failed" || e.retries < 3).length;
  } catch {
    return 0;
  }
}
