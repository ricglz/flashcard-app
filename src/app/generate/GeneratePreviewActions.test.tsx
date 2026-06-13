import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GeneratePreviewActions from "./GeneratePreviewActions";

describe("GeneratePreviewActions", () => {
  it("disables back and confirm while locked", () => {
    render(
      <GeneratePreviewActions
        selectedCount={1}
        totalCount={2}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
        locked
      />,
    );

    expect(screen.getByText("1 of 2 cards included")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create Set (1 cards)" })).toBeDisabled();
  });

  it("disables confirmation when no cards are included", () => {
    render(
      <GeneratePreviewActions
        selectedCount={0}
        totalCount={2}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
        locked={false}
      />,
    );

    expect(screen.getByText("0 of 2 cards included")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create Set (0 cards)" })).toBeDisabled();
  });
});
