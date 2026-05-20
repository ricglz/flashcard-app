import { describe, it, expect, vi } from "vitest";
import { stripHallucinatedFnCalls } from "./stripHallucinatedFnCalls";

describe("stripHallucinatedFnCalls", () => {
  it("strips a simple <function=name></function> tag", () => {
    expect(stripHallucinatedFnCalls("hello <function=list_sets></function> world")).toBe(
      "hello  world",
    );
  });

  it("strips tag with content inside", () => {
    expect(
      stripHallucinatedFnCalls('call <function=get_weak_cards>{"methodology":"balanced"}</function> done'),
    ).toBe("call  done");
  });

  it("strips multiple tags in one string", () => {
    expect(
      stripHallucinatedFnCalls("<function=a></function> text <function=b></function>"),
    ).toBe(" text ");
  });

  it("returns plain text unchanged", () => {
    const plain = "This is a normal response with no function calls.";
    expect(stripHallucinatedFnCalls(plain)).toBe(plain);
  });

  it("returns empty string when input is only a function tag", () => {
    expect(stripHallucinatedFnCalls("<function=list_sets></function>")).toBe("");
  });

  it("calls onStrip for each match", () => {
    const onStrip = vi.fn();
    stripHallucinatedFnCalls(
      "<function=a></function> gap <function=b></function>",
      onStrip,
    );
    expect(onStrip).toHaveBeenCalledTimes(2);
    expect(onStrip).toHaveBeenCalledWith("<function=a></function>");
    expect(onStrip).toHaveBeenCalledWith("<function=b></function>");
  });

  it("does not call onStrip when there are no matches", () => {
    const onStrip = vi.fn();
    stripHallucinatedFnCalls("clean text", onStrip);
    expect(onStrip).not.toHaveBeenCalled();
  });

  it("handles multiline content inside tag", () => {
    const input = `prefix <function=tool>{\n  "key": "value"\n}</function> suffix`;
    expect(stripHallucinatedFnCalls(input)).toBe("prefix  suffix");
  });
});
