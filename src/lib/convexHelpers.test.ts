import { describe, expect, it } from "vitest";
import { parseId } from "./convexHelpers";

describe("parseId", () => {
  it("accepts URL-safe Convex ID-shaped values", () => {
    expect(parseId<"flashcardSets">("abc123def456ghi7")).toBe("abc123def456ghi7");
  });

  it("rejects obviously invalid route params", () => {
    expect(parseId<"flashcardSets">("not a convex id")).toBeNull();
    expect(parseId<"flashcardSets">("../sets")).toBeNull();
    expect(parseId<"flashcardSets">("short")).toBeNull();
    expect(parseId<"flashcardSets">("ABC123DEF456GHI7")).toBeNull();
  });
});
