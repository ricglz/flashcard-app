import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import TokenAnnotationEditor from "./TokenAnnotationEditor";

const pronunciationField: FieldDefinition = {
  name: "Pronunciation",
  role: "pronunciation",
  metadata: {},
  order: 0,
};

describe("TokenAnnotationEditor", () => {
  it("highlights every token covered by a multi-token annotation", () => {
    render(
      <TokenAnnotationEditor
        field={pronunciationField}
        text="ni3 hao3 ma5"
        annotations={[{ start: 0, end: 8, gloss: "hello" }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "ni3" })).toHaveClass("text-success");
    expect(screen.getByRole("button", { name: "hao3" })).toHaveClass("text-success");
    expect(screen.getByRole("button", { name: "ma5" })).not.toHaveClass("text-success");
  });
});
