import { describe, expect, it } from "vitest";
import { validateCardFields } from "../../convex/domain/cardFields";
import { assertDomainResult } from "../../convex/domain/result";

const validFieldNames = ["Front", "Back"] as const;

describe("validateCardFields", () => {
  it("returns ok for known fields with at least one value", () => {
    expect(
      validateCardFields(validFieldNames, { Front: "Question", Back: "" })
    ).toEqual({ ok: true, value: { Front: "Question", Back: "" } });
  });

  it("allows omitted field definitions", () => {
    expect(validateCardFields(validFieldNames, { Front: "Question" })).toEqual({
      ok: true,
      value: { Front: "Question" },
    });
  });

  it("returns a typed failure for unknown fields", () => {
    const result = validateCardFields(validFieldNames, {
      Front: "Question",
      Extra: "Nope",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        _tag: "UnknownCardField",
        message: "Unknown field: Extra",
        fieldName: "Extra",
        validFieldNames,
      },
    });
  });

  it("returns a typed failure when every field is blank", () => {
    const result = validateCardFields(validFieldNames, {
      Front: " ",
      Back: "\t",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        _tag: "EmptyCardFields",
        message: "At least one field value is required",
      },
    });
  });

  it("returns the same empty-card failure for no fields", () => {
    expect(validateCardFields(validFieldNames, {})).toEqual({
      ok: false,
      error: {
        _tag: "EmptyCardFields",
        message: "At least one field value is required",
      },
    });
  });
});

describe("assertDomainResult", () => {
  it("throws the user-safe domain failure message", () => {
    expect(() =>
      assertDomainResult(validateCardFields(validFieldNames, { Extra: "Nope" }))
    ).toThrow("Unknown field: Extra");
  });
});
