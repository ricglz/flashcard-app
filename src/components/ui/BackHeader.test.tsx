import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackHeader } from "./BackHeader";

describe("BackHeader", () => {
  it("renders back link with href and label", () => {
    render(<BackHeader href="/" label="Dashboard" />);
    const link = screen.getByRole("link", { name: "← Dashboard" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveClass("text-sm", "text-muted");
  });

  it("renders right slot", () => {
    render(<BackHeader href="/" label="Back" right={<span>Right</span>} />);
    expect(screen.getByText("Right")).toBeInTheDocument();
  });
});
