import { describe, expect, it } from "vitest";
import { validateTokenAnnotationsForCard } from "../../convex/domain/tokenAnnotations";

describe("token annotation validation", () => {
  it("accepts sorted non-overlapping spans within code point bounds", () => {
    const result = validateTokenAnnotationsForCard({
      validFieldNames: ["Front"],
      fields: { Front: "你😀好" },
      tokenAnnotations: {
        Front: [{ start: 1, end: 3, gloss: "emoji good" }],
      },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        Front: [{ start: 1, end: 3, gloss: "emoji good" }],
      },
    });
  });

  it("rejects unknown fields and out-of-range spans without logging gloss content", () => {
    const unknown = validateTokenAnnotationsForCard({
      validFieldNames: ["Front"],
      fields: { Front: "你" },
      tokenAnnotations: {
        Back: [{ start: 0, end: 1, gloss: "secret" }],
      },
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.ok ? "" : unknown.error.message).toContain("annotations_invalid_for_field");
    expect(unknown.ok ? "" : unknown.error.message).not.toContain("secret");

    const outOfRange = validateTokenAnnotationsForCard({
      validFieldNames: ["Front"],
      fields: { Front: "你" },
      tokenAnnotations: {
        Front: [{ start: 0, end: 2, gloss: "secret" }],
      },
    });
    expect(outOfRange.ok).toBe(false);
    expect(outOfRange.ok ? "" : outOfRange.error.message).toContain("length 1");
    expect(outOfRange.ok ? "" : outOfRange.error.message).not.toContain("secret");
    expect(outOfRange.ok ? null : outOfRange.error.reason).toEqual({
      kind: "span_out_of_bounds",
      start: 0,
      end: 2,
      length: 1,
    });
  });
});
