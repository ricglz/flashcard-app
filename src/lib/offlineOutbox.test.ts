import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSyncFailure } from "./offlineOutbox";

// The outbox uses idb (IndexedDB) which isn't available in edge-runtime.
// We mock getDb() to return a simple in-memory store.

type Entry = {
  id: number;
  mutationName: string;
  args: unknown;
  createdAt: number;
  status: string;
  retries: number;
};

function createMockDb() {
  let autoId = 0;
  const store = new Map<number, Entry>();

  return {
    add(_storeName: string, entry: Omit<Entry, "id">) {
      const id = ++autoId;
      store.set(id, { ...entry, id });
      return id;
    },
    get(_storeName: string, id: number) {
      return store.get(id) ?? null;
    },
    getAll(_storeName: string) {
      return [...store.values()].sort((a, b) => a.id - b.id);
    },
    put(_storeName: string, entry: Entry) {
      store.set(entry.id, entry);
    },
    delete(_storeName: string, id: number) {
      store.delete(id);
    },
    _clear() {
      store.clear();
      autoId = 0;
    },
  };
}

let mockDb: ReturnType<typeof createMockDb>;

vi.mock("./offlineDb", () => ({
  getDb: () => Promise.resolve(mockDb),
}));

// Stub window.dispatchEvent since edge-runtime doesn't have it
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for edge-runtime test environment
if (typeof window !== "undefined" && !window.dispatchEvent) {
  window.dispatchEvent = () => true;
}
if (typeof window === "undefined") {
  // @ts-expect-error — test-only global stub for edge-runtime environment
  globalThis.window = {
    dispatchEvent: () => true,
  };
}

let outboxModule: typeof import("./offlineOutbox");

beforeEach(async () => {
  mockDb = createMockDb();
  outboxModule = await import("./offlineOutbox");
});

afterEach(() => {
  mockDb._clear();
});

describe("normalizeSyncFailure", () => {
  it("categorizes auth-related errors as authRequiredRetry", () => {
    expect(normalizeSyncFailure(new Error("Unauthenticated"))).toBe("authRequiredRetry");
    expect(normalizeSyncFailure(new Error("Please sign in"))).toBe("authRequiredRetry");
    expect(normalizeSyncFailure(new Error("auth token expired"))).toBe("authRequiredRetry");
  });

  it("categorizes other errors as permanentFailure", () => {
    expect(normalizeSyncFailure(new Error("Network error"))).toBe("permanentFailure");
    expect(normalizeSyncFailure(new Error("Server error"))).toBe("permanentFailure");
    expect(normalizeSyncFailure("string error")).toBe("permanentFailure");
  });
});

describe("outbox drain ordering", () => {
  it("returns entries in FIFO order by auto-increment id", async () => {
    await outboxModule.addToOutbox("mutation.a", { n: 1 });
    await outboxModule.addToOutbox("mutation.b", { n: 2 });
    await outboxModule.addToOutbox("mutation.c", { n: 3 });

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0]!.mutationName).toBe("mutation.a");
    expect(entries[1]!.mutationName).toBe("mutation.b");
    expect(entries[2]!.mutationName).toBe("mutation.c");
    expect(entries[0]!.id).toBeLessThan(entries[1]!.id);
    expect(entries[1]!.id).toBeLessThan(entries[2]!.id);
  });

  it("excludes failed entries with retries >= 3", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");
    await outboxModule.markFailed(result.id, 3, "permanentFailure");

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(0);
  });

  it("includes entries with retries < 3 as pending", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");
    await outboxModule.markFailed(result.id, 2, "permanentFailure");

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("pending");
  });
});

describe("duplicate replay", () => {
  it("stores duplicate mutations separately without dedup", async () => {
    await outboxModule.addToOutbox("srsReviewQueue.recordReview", { srsCardId: "abc", rating: "good" });
    await outboxModule.addToOutbox("srsReviewQueue.recordReview", { srsCardId: "abc", rating: "good" });

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.id).not.toBe(entries[1]!.id);
  });

  it("keeps second entry after first is removed", async () => {
    const first = await outboxModule.addToOutbox("mutation.a", { n: 1 });
    await outboxModule.addToOutbox("mutation.a", { n: 2 });
    if (!first.ok) throw new Error("addToOutbox failed");

    await outboxModule.removeEntry(first.id);

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect((entries[0]!.args as { n: number }).n).toBe(2);
  });
});

describe("failure recovery", () => {
  it("keeps entry fetchable when retries < 3", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(result.id, 1, "permanentFailure");
    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("pending");
    expect(entries[0]!.retries).toBe(1);
  });

  it("excludes entry from pending when retries >= 3", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(result.id, 3, "permanentFailure");
    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(0);

    const count = await outboxModule.getPendingCount();
    expect(count).toBe(0);
  });

  it("marks auth failures as auth_required", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(result.id, 1, "authRequiredRetry");

    const pending = await outboxModule.getPendingEntries();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.status).toBe("auth_required");

    const count = await outboxModule.getPendingCount();
    expect(count).toBe(0);
  });

  it("transitions entry through syncing status", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markSyncing(result.id);
    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("syncing");
  });
});

describe("getPendingCount", () => {
  it("counts only pending and syncing entries", async () => {
    await outboxModule.addToOutbox("mutation.a", {});
    await outboxModule.addToOutbox("mutation.b", {});
    const third = await outboxModule.addToOutbox("mutation.c", {});
    if (!third.ok) throw new Error("addToOutbox failed");
    await outboxModule.markFailed(third.id, 3, "permanentFailure");

    const count = await outboxModule.getPendingCount();
    expect(count).toBe(2);
  });
});
