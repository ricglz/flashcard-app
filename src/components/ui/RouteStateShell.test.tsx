import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteStateShellWithHeader, RouteStateShellCentered } from "./RouteStateShell";

describe("RouteStateShellWithHeader", () => {
  it("renders header and centered children", () => {
    render(
      <RouteStateShellWithHeader backHref="/" backLabel="Dashboard">
        <div>Body</div>
      </RouteStateShellWithHeader>
    );
    expect(screen.getByRole("link", { name: "← Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Body").closest("main")).toHaveClass("flex-1");
  });
});

describe("RouteStateShellCentered", () => {
  it("renders centered without header", () => {
    render(
      <RouteStateShellCentered>
        <div>Centered</div>
      </RouteStateShellCentered>
    );
    expect(screen.getByText("Centered")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    const outer = screen.getByText("Centered").closest("div.min-h-screen");
    expect(outer).toHaveClass("flex", "items-center", "justify-center");
  });
});
