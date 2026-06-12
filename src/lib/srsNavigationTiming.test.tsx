import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeSrsNavigationStart,
  markSrsNavigationStart,
} from "./srsNavigationTiming";

describe("SRS navigation timing", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(performance, "now").mockReturnValue(1234);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores and consumes a navigation start timestamp", () => {
    markSrsNavigationStart();

    expect(consumeSrsNavigationStart()).toBe(1234);
    expect(consumeSrsNavigationStart()).toBeNull();
  });
});
