import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

const mockBack = vi.fn();
const mockPush = vi.fn();
let mockPathname = "/test";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  usePathname: () => mockPathname,
}));

describe("PageHeader", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockPathname = "/test";
    Object.defineProperty(window.history, "length", { value: 2, configurable: true });
  });

  it("renders title centered", () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.getByRole("heading", { name: "Test Title" })).toHaveClass("text-xl", "font-bold", "text-center");
  });

  it("renders back button when history length > 1", () => {
    render(<PageHeader backLabel="Dashboard" />);
    const btn = screen.getByRole("button", { name: "← Dashboard" });
    expect(btn).toHaveClass("text-sm", "text-muted");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to dashboard when no history", () => {
    Object.defineProperty(window.history, "length", { value: 1, configurable: true });
    render(<PageHeader title="No Back" />);
    const btn = screen.getByRole("button", { name: "← Back" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("hides back button on dashboard", () => {
    mockPathname = "/";
    render(<PageHeader title="Flashcard App" />);
    expect(screen.queryByRole("button", { name: /←/ })).toBeNull();
  });

  it("renders actions slot", () => {
    render(<PageHeader title="A" actions={<span>Action</span>} />);
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("applies disabled state to back button", () => {
    render(<PageHeader backLabel="Back" backDisabled />);
    const btn = screen.getByRole("button", { name: "← Back" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveClass("disabled:opacity-50");
  });
});
