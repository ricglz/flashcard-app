import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TappablePinyinText from "./TappablePinyinText";

describe("TappablePinyinText", () => {
  it("renders multi-token annotation spans with one tooltip", () => {
    render(
      <TappablePinyinText
        text="ni3 hao3 ma5"
        annotations={[{ start: 0, end: 8, gloss: "hello" }]}
      />,
    );

    expect(screen.getByText("ni3 hao3")).toBeInTheDocument();
    expect(screen.getByText("ma5")).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("hello");
  });
});
