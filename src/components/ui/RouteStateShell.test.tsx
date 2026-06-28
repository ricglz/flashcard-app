import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteStateShellWithHeader, RouteStateShellCentered } from "./RouteStateShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => "/test",
}));

describe("RouteStateShellWithHeader", () => {
  it("renders header and centered children", () => {
    Object.defineProperty(window.history, "length", { value: 2, configurable: true });
    render(
      <RouteStateShellWithHeader backLabel="Dashboard">
        <div>Body</div>
      </RouteStateShellWithHeader>
    );
    expect(screen.getByRole("button", { name: "← Dashboard" })).toBeInTheDocument();
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
