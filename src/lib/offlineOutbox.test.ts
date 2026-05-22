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
  queuedWhileOnline?: boolean;
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

const dispatchSpy = vi.fn(() => true);
if (typeof window !== "undefined") {
  window.dispatchEvent = dispatchSpy;
} else {
  // @ts-expect-error — test-only global stub for edge-runtime environment
  globalThis.window = { dispatchEvent: dispatchSpy };
}

let outboxModule: typeof import("./offlineOutbox");

beforeEach(async () => {
  mockDb = createMockDb();
  dispatchSpy.mockClear();
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

describe("getVisiblePendingCount", () => {
  it("excludes entries queued while online", async () => {
    await outboxModule.addToOutbox("mutation.online", {}, { queuedWhileOnline: true });
    await outboxModule.addToOutbox("mutation.offline", {}, { queuedWhileOnline: false });

    const count = await outboxModule.getVisiblePendingCount();
    expect(count).toBe(1);
  });

  it("counts legacy entries with no origin metadata as visible", async () => {
    await outboxModule.addToOutbox("mutation.legacy", {});

    const count = await outboxModule.getVisiblePendingCount();
    expect(count).toBe(1);
  });

  it("does not count failed or auth-required entries", async () => {
    const failed = await outboxModule.addToOutbox("mutation.failed", {}, { queuedWhileOnline: false });
    const authRequired = await outboxModule.addToOutbox("mutation.auth", {}, { queuedWhileOnline: false });
    if (!failed.ok || !authRequired.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(failed.id, 3, "permanentFailure");
    await outboxModule.markFailed(authRequired.id, 1, "authRequiredRetry");

    const count = await outboxModule.getVisiblePendingCount();
    expect(count).toBe(0);
  });
});

describe("addToOutbox", () => {
  it("returns queued outcome with a positive id", async () => {
    const result = await outboxModule.addToOutbox("mutation.x", { key: "val" });
    expect(result).toMatchObject({ ok: true, status: "queued", id: expect.any(Number) });
    expect(result.id).toBeGreaterThan(0);
  });

  it("stores queuedWhileOnline metadata", async () => {
    await outboxModule.addToOutbox("mutation.x", {}, { queuedWhileOnline: true });

    const entries = await outboxModule.getPendingEntries();
    expect(entries[0]!.queuedWhileOnline).toBe(true);
  });

  it("dispatches outbox-changed event on success", async () => {
    await outboxModule.addToOutbox("mutation.x", { key: "val" });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("returns permanentFailure when IndexedDB write fails", async () => {
    mockDb.add = () => { throw new Error("QuotaExceededError"); };
    const result = await outboxModule.addToOutbox("mutation.x", { key: "val" });
    expect(result).toEqual({ ok: false, status: "permanentFailure", id: -1, message: "QuotaExceededError" });
  });

  it("does not dispatch event when IndexedDB write fails", async () => {
    mockDb.add = () => { throw new Error("QuotaExceededError"); };
    await outboxModule.addToOutbox("mutation.x", { key: "val" });
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("markSyncing", () => {
  it("does not dispatch outbox-changed event", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.markSyncing(result.id);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("silently handles non-existent id", async () => {
    await expect(outboxModule.markSyncing(999)).resolves.toBeUndefined();
  });
});

describe("event dispatch", () => {
  it("addToOutbox dispatches outbox-changed", async () => {
    await outboxModule.addToOutbox("mutation.a", {});
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("markFailed dispatches outbox-changed", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.markFailed(result.id, 1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("removeEntry dispatches outbox-changed", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.removeEntry(result.id);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("markSyncing does NOT dispatch outbox-changed", async () => {
    const result = await outboxModule.addToOutbox("mutation.a", {});
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.markSyncing(result.id);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
