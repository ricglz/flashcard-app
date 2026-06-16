import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with default aria label", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders with custom label visible and aria", () => {
    render(<Spinner label="Generating cards..." />);
    expect(screen.getByRole("status", { name: "Generating cards..." })).toBeInTheDocument();
    expect(screen.getByText("Generating cards...")).toBeInTheDocument();
  });

  it("applies size classes", () => {
    const { container, rerender } = render(<Spinner size="sm" />);
    expect(container.querySelector("svg")).toHaveClass("h-4", "w-4");

    rerender(<Spinner size="md" />);
    expect(container.querySelector("svg")).toHaveClass("h-6", "w-6");

    rerender(<Spinner size="lg" />);
    expect(container.querySelector("svg")).toHaveClass("h-8", "w-8");

    rerender(<Spinner size="xl" />);
    expect(container.querySelector("svg")).toHaveClass("h-10", "w-10");
  });

  it("has animate-spin class for visible animation", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("inline mode does not render label text", () => {
    render(<Spinner label="Loading data" inline />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Loading data")).not.toBeInTheDocument();
  });
});
