import { describe, expect, it } from "vitest";
import { shouldDrainOutbox, shouldShowOfflineIndicator } from "./syncState";

describe("shouldDrainOutbox", () => {
  it("drains only when online, idle, and pending entries exist", () => {
    expect(shouldDrainOutbox({ isOnline: true, isSyncing: false, pendingCount: 1 })).toBe(true);
    expect(shouldDrainOutbox({ isOnline: false, isSyncing: false, pendingCount: 1 })).toBe(false);
    expect(shouldDrainOutbox({ isOnline: true, isSyncing: true, pendingCount: 1 })).toBe(false);
    expect(shouldDrainOutbox({ isOnline: true, isSyncing: false, pendingCount: 0 })).toBe(false);
  });
});

describe("shouldShowOfflineIndicator", () => {
  it("shows whenever offline", () => {
    expect(shouldShowOfflineIndicator({ isOnline: false, visiblePendingCount: 0 })).toBe(true);
    expect(shouldShowOfflineIndicator({ isOnline: false, visiblePendingCount: 1 })).toBe(true);
  });

  it("shows online only when visible pending entries exist", () => {
    expect(shouldShowOfflineIndicator({ isOnline: true, visiblePendingCount: 1 })).toBe(true);
    expect(shouldShowOfflineIndicator({ isOnline: true, visiblePendingCount: 0 })).toBe(false);
  });
});
