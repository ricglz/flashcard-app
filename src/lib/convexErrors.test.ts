import { describe, expect, it } from "vitest";
import { isConvexArgumentValidationError } from "./convexErrors";

describe("isConvexArgumentValidationError", () => {
  it("matches Convex id argument validation failures", () => {
    expect(
      isConvexArgumentValidationError(
        new Error(
          'ArgumentValidationError: Value "j0000000000000000000000000000000" does not match validator v.id("flashcardSets")',
        ),
      ),
    ).toBe(true);
  });

  it("does not match unrelated Convex or runtime errors", () => {
    expect(isConvexArgumentValidationError(new Error("Not authenticated"))).toBe(false);
    expect(isConvexArgumentValidationError(new Error("Network request failed"))).toBe(false);
  });
});
