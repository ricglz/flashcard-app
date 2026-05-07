import { openDB, type IDBPDatabase, type DBSchema } from "idb";

interface OfflineCacheSchema extends DBSchema {
  queryCache: {
    key: string;
    value: {
      key: string;
      data: unknown;
      updatedAt: number;
    };
  };
}

const DB_NAME = "flashcard-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineCacheSchema>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("queryCache")) {
          db.createObjectStore("queryCache", { keyPath: "key" });
        }
      },
    });
  }
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
