import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("renders title description and actions", async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Error"
        description="Something"
        onRetry={onRetry}
        href="/dash"
        actionLabel="Go"
        retryLabel="Retry"
      />
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Something")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/dash");
  });

  it("renders without retry button when onRetry omitted", () => {
    render(<ErrorState title="Error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
