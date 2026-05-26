import { beforeEach, describe, expect, it, vi } from "vitest";

const queryCache = new Map<string, { key: string; data: unknown; updatedAt: number }>();
const deleteMock = vi.fn(async (storeName: string, key: string) => {
  if (storeName === "queryCache") {
    queryCache.delete(key);
  }
});

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    put: async (
      storeName: string,
      value: { key: string; data: unknown; updatedAt: number },
    ) => {
      if (storeName === "queryCache") {
        queryCache.set(value.key, value);
      }
    },
    get: async (storeName: string, key: string) =>
      storeName === "queryCache" ? queryCache.get(key) : undefined,
    delete: deleteMock,
  })),
}));

describe("offlineDb", () => {
  beforeEach(() => {
    queryCache.clear();
    deleteMock.mockClear();
  });

  it("deletes cached query rows by key", async () => {
    const { deleteCachedQuery, getCachedQuery, putCachedQuery } = await import(
      "./offlineDb"
    );

    await putCachedQuery("progress:getDailyHistory:{\"days\":7}", {
      ok: false,
    });
    await deleteCachedQuery("progress:getDailyHistory:{\"days\":7}");

    await expect(
      getCachedQuery("progress:getDailyHistory:{\"days\":7}"),
    ).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith(
      "queryCache",
      "progress:getDailyHistory:{\"days\":7}",
    );
  });
});
