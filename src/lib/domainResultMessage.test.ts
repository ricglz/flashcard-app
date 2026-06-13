import { describe, expect, it } from "vitest";
import { getFailureMessage } from "./domainResultMessage";

describe("getFailureMessage", () => {
  it("uses non-empty failure messages", () => {
    expect(getFailureMessage({ message: "No access" })).toBe("No access");
  });

  it("falls back for malformed failure values", () => {
    expect(getFailureMessage({ message: "" }, "Fallback")).toBe("Fallback");
    expect(getFailureMessage(null, "Fallback")).toBe("Fallback");
  });
});
