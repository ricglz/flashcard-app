import { openDB, type IDBPDatabase, type DBSchema } from "idb";

export type OutboxStatus = "pending" | "syncing" | "failed" | "auth_required";

export type OutboxEntry = {
  id?: number;
  mutationName: string;
  args: unknown;
  createdAt: number;
  status: OutboxStatus;
  retries: number;
  queuedWhileOnline?: boolean;
};

type OfflineCacheSchema = DBSchema & {
  queryCache: {
    key: string;
    value: {
      key: string;
      data: unknown;
      updatedAt: number;
    };
  };
  outbox: {
    key: number;
    value: OutboxEntry;
  };
};

const DB_NAME = "flashcard-offline";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<OfflineCacheSchema>> | null = null;

export function getDb() {
  dbPromise ??= openDB<OfflineCacheSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("queryCache")) {
        db.createObjectStore("queryCache", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
  return dbPromise;
}

export async function putCachedQuery(
  key: string,
  data: unknown
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("queryCache", { key, data, updatedAt: Date.now() });
  } catch {
    // IndexedDB unavailable (e.g. private browsing) — silently skip
  }
}

export async function getCachedQuery<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    const entry = await db.get("queryCache", key);
    return entry?.data as T | undefined;
  } catch {
    return undefined;
  }
}

export async function deleteCachedQuery(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete("queryCache", key);
  } catch {
    // IndexedDB unavailable (e.g. private browsing) — silently skip
  }
}
