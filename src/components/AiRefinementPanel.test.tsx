import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AiRefinementPanel from "./AiRefinementPanel";

vi.mock("@/contexts/AvailableModelsContext", () => ({
  useAvailableModelsContext: () => [
    { id: "fast-model", name: "Fast model" },
    { id: "precise-model", name: "Precise model" },
  ],
  AvailableModelsContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

const cards = [
  { selected: true },
  { selected: false },
  { selected: true },
];

function renderPanel({
  refinementModel = "fast-model",
  onRefinementModelChange = vi.fn(),
  onRefine = vi.fn().mockResolvedValue({ kind: "applied" }),
  pending = false,
  disabled = false,
  panelCards = cards,
}: {
  refinementModel?: string;
  onRefinementModelChange?: (model: string) => void;
  onRefine?: React.ComponentProps<typeof AiRefinementPanel>["onRefine"];
  pending?: boolean;
  disabled?: boolean;
  panelCards?: React.ComponentProps<typeof AiRefinementPanel>["cards"];
} = {}) {
  render(
    <AiRefinementPanel
      cards={panelCards}
      refinementModel={refinementModel}
      onRefinementModelChange={onRefinementModelChange}
      onRefine={onRefine}
      pending={pending}
      disabled={disabled}
    />,
  );
}

describe("AiRefinementPanel", () => {
  it("submits trimmed instructions with the selected scope and model", async () => {
    const user = userEvent.setup();
    const onRefine = vi.fn()
      .mockResolvedValueOnce({ kind: "not_applied", reason: "provider_error" })
      .mockResolvedValueOnce({ kind: "applied" });
    const onRefinementModelChange = vi.fn();
    renderPanel({ onRefine, onRefinementModelChange });

    expect(screen.getByRole("option", { name: "All cards (3)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Included cards (2)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Excluded cards (1)" })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Revision model" }),
      "precise-model",
    );
    expect(onRefinementModelChange).toHaveBeenCalledWith("precise-model");

    await user.type(
      screen.getByRole("textbox", { name: "Refine cards" }),
      "  tighten wording  ",
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Revise" }), "included");
    await user.click(screen.getByRole("button", { name: "Refine Draft" }));

    expect(onRefine).toHaveBeenCalledWith({
      instructions: "tighten wording",
      model: "fast-model",
      scope: "included",
    });
    expect(screen.getByRole("textbox", { name: "Refine cards" })).toHaveValue("  tighten wording  ");

    await user.click(screen.getByRole("button", { name: "Refine Draft" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Refine cards" })).toHaveValue("");
    });
  });

  it("keeps the current model option when it is not in the available model list", () => {
    renderPanel({ refinementModel: "legacy-model" });

    expect(screen.getByRole("option", { name: "Default for provider" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "legacy-model" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fast model" })).toBeInTheDocument();
  });

  it("disables refinement for blank instructions, empty scopes, pending work, and parent locks", async () => {
    const user = userEvent.setup();
    const onRefine = vi.fn().mockResolvedValue({ kind: "applied" });
    renderPanel({ onRefine, panelCards: [{ selected: true }] });

    const refineButton = screen.getByRole("button", { name: "Refine Draft" });
    expect(refineButton).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Refine cards" }), "revise this");
    expect(refineButton).toBeEnabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Revise" }), "excluded");
    expect(refineButton).toBeDisabled();
    await user.click(refineButton);
    expect(onRefine).not.toHaveBeenCalled();
  });

  it("locks controls and shows loading state while refinement is pending", () => {
    renderPanel({ pending: true });

    expect(screen.getByRole("textbox", { name: "Refine cards" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Revise" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Revision model" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "..." })).toBeDisabled();
  });

  it("locks controls when the parent preview is disabled", () => {
    renderPanel({ disabled: true });

    expect(screen.getByRole("textbox", { name: "Refine cards" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Revise" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Revision model" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refine Draft" })).toBeDisabled();
  });
});
