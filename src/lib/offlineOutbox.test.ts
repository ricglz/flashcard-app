import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSyncFailure } from "./offlineOutbox";
import { parseId } from "./convexHelpers";

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

const srsCardId = parseId<"srsCards">("abc123def456ghi7")!;
const recordReviewArgs = { srsCardId, rating: "good" as const };
const hardReviewArgs = { srsCardId, rating: "hard" as const };
const easyReviewArgs = { srsCardId, rating: "easy" as const };

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
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", hardReviewArgs);
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", easyReviewArgs);

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0]!.mutationName).toBe("srsReviewQueue:recordReview");
    expect(entries[1]!.mutationName).toBe("srsReviewQueue:recordReview");
    expect(entries[2]!.mutationName).toBe("srsReviewQueue:recordReview");
    expect(entries[0]!.id).toBeLessThan(entries[1]!.id);
    expect(entries[1]!.id).toBeLessThan(entries[2]!.id);
  });

  it("excludes failed entries with retries >= 3", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");
    await outboxModule.markFailed(result.id, 3, "permanentFailure");

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(0);
  });

  it("includes entries with retries < 3 as pending", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");
    await outboxModule.markFailed(result.id, 2, "permanentFailure");

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("pending");
  });

  it("excludes and fails unknown persisted mutation names", async () => {
    mockDb.add("outbox", {
      mutationName: "unknown:mutation",
      args: {},
      createdAt: Date.now(),
      status: "pending",
      retries: 0,
    });

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(0);
    expect(await outboxModule.getPendingCount()).toBe(0);
  });

  it("excludes and fails persisted entries with invalid args", async () => {
    mockDb.add("outbox", {
      mutationName: "srsReviewQueue:recordReview",
      args: { srsCardId: "not an id", rating: "good" },
      createdAt: Date.now(),
      status: "pending",
      retries: 0,
    });

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(0);
    expect(await outboxModule.getPendingCount()).toBe(0);
  });
});

describe("duplicate replay", () => {
  it("stores duplicate mutations separately without dedup", async () => {
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.id).not.toBe(entries[1]!.id);
  });

  it("keeps second entry after first is removed", async () => {
    const first = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", hardReviewArgs);
    if (!first.ok) throw new Error("addToOutbox failed");

    await outboxModule.removeEntry(first.id);

    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.args.rating).toBe("hard");
  });
});

describe("failure recovery", () => {
  it("keeps entry fetchable when retries < 3", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(result.id, 1, "permanentFailure");
    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("pending");
    expect(entries[0]!.retries).toBe(1);
  });

  it("excludes entry from pending when retries >= 3", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(result.id, 3, "permanentFailure");
    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(0);

    const count = await outboxModule.getPendingCount();
    expect(count).toBe(0);
  });

  it("marks auth failures as auth_required", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(result.id, 1, "authRequiredRetry");

    const pending = await outboxModule.getPendingEntries();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.status).toBe("auth_required");

    const count = await outboxModule.getPendingCount();
    expect(count).toBe(0);
  });

  it("transitions entry through syncing status", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");

    await outboxModule.markSyncing(result.id);
    const entries = await outboxModule.getPendingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.status).toBe("syncing");
  });
});

describe("getPendingCount", () => {
  it("counts only pending and syncing entries", async () => {
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", hardReviewArgs);
    const third = await outboxModule.addToOutbox("srsReviewQueue:recordReview", easyReviewArgs);
    if (!third.ok) throw new Error("addToOutbox failed");
    await outboxModule.markFailed(third.id, 3, "permanentFailure");

    const count = await outboxModule.getPendingCount();
    expect(count).toBe(2);
  });
});

describe("getVisiblePendingCount", () => {
  it("excludes entries queued while online", async () => {
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs, { queuedWhileOnline: true });
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", hardReviewArgs, { queuedWhileOnline: false });

    const count = await outboxModule.getVisiblePendingCount();
    expect(count).toBe(1);
  });

  it("counts legacy entries with no origin metadata as visible", async () => {
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);

    const count = await outboxModule.getVisiblePendingCount();
    expect(count).toBe(1);
  });

  it("does not count failed or auth-required entries", async () => {
    const failed = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs, { queuedWhileOnline: false });
    const authRequired = await outboxModule.addToOutbox("srsReviewQueue:recordReview", hardReviewArgs, { queuedWhileOnline: false });
    if (!failed.ok || !authRequired.ok) throw new Error("addToOutbox failed");

    await outboxModule.markFailed(failed.id, 3, "permanentFailure");
    await outboxModule.markFailed(authRequired.id, 1, "authRequiredRetry");

    const count = await outboxModule.getVisiblePendingCount();
    expect(count).toBe(0);
  });
});

describe("addToOutbox", () => {
  it("returns queued outcome with a positive id", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    expect(result).toMatchObject({ ok: true, status: "queued", id: expect.any(Number) });
    expect(result.id).toBeGreaterThan(0);
  });

  it("stores queuedWhileOnline metadata", async () => {
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs, { queuedWhileOnline: true });

    const entries = await outboxModule.getPendingEntries();
    expect(entries[0]!.queuedWhileOnline).toBe(true);
  });

  it("dispatches outbox-changed event on success", async () => {
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("returns permanentFailure when IndexedDB write fails", async () => {
    mockDb.add = () => { throw new Error("QuotaExceededError"); };
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    expect(result).toEqual({ ok: false, status: "permanentFailure", id: -1, message: "QuotaExceededError" });
  });

  it("does not dispatch event when IndexedDB write fails", async () => {
    mockDb.add = () => { throw new Error("QuotaExceededError"); };
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("markSyncing", () => {
  it("does not dispatch outbox-changed event", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
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
    await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("markFailed dispatches outbox-changed", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.markFailed(result.id, 1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("removeEntry dispatches outbox-changed", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.removeEntry(result.id);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "outbox-changed" }));
  });

  it("markSyncing does NOT dispatch outbox-changed", async () => {
    const result = await outboxModule.addToOutbox("srsReviewQueue:recordReview", recordReviewArgs);
    if (!result.ok) throw new Error("addToOutbox failed");
    dispatchSpy.mockClear();

    await outboxModule.markSyncing(result.id);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
