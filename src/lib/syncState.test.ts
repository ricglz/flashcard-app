import { describe, expect, it } from "vitest";
import { shouldDrainOutbox } from "./syncState";

describe("shouldDrainOutbox", () => {
  it("drains only when online, idle, and pending entries exist", () => {
    expect(shouldDrainOutbox({ isOnline: true, isSyncing: false, pendingCount: 1 })).toBe(true);
    expect(shouldDrainOutbox({ isOnline: false, isSyncing: false, pendingCount: 1 })).toBe(false);
    expect(shouldDrainOutbox({ isOnline: true, isSyncing: true, pendingCount: 1 })).toBe(false);
    expect(shouldDrainOutbox({ isOnline: true, isSyncing: false, pendingCount: 0 })).toBe(false);
  });
});
