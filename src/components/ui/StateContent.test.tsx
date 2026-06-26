import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateContent } from "./StateContent";

describe("StateContent", () => {
  it("renders title description and actions", () => {
    render(
      <StateContent
        title="Title"
        description="Desc"
        actions={<button>Action</button>}
      />
    );
    expect(screen.getByText("Title")).toHaveClass("text-lg", "font-medium");
    expect(screen.getByText("Desc")).toHaveClass("text-muted");
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("applies lg size", () => {
    render(<StateContent title="Big" size="lg" />);
    expect(screen.getByText("Big")).toHaveClass("text-2xl", "font-bold");
  });

  it("renders icon slot", () => {
    render(<StateContent title="T" icon={<span>Icon</span>} />);
    expect(screen.getByText("Icon")).toBeInTheDocument();
  });
});
