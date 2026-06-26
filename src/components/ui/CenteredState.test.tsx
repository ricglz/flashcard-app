import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CenteredState } from "./CenteredState";

describe("CenteredState", () => {
  it("renders children centered with default md width", () => {
    const { container } = render(<CenteredState>Content</CenteredState>);
    expect(screen.getByText("Content")).toBeInTheDocument();
    const main = screen.getByText("Content").closest("main");
    expect(main).toHaveClass("flex-1", "flex", "items-center", "justify-center");
    const inner = container.querySelector("main > div");
    expect(inner).toHaveClass("max-w-md", "w-full", "text-center");
  });

  it("applies sm width", () => {
    const { container } = render(<CenteredState maxWidth="sm">Small</CenteredState>);
    const inner = container.querySelector("main > div");
    expect(inner).toHaveClass("max-w-sm");
  });
});
