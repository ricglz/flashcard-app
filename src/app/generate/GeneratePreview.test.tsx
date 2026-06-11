import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";
import GeneratePreview from "./GeneratePreview";

vi.mock("@/hooks/useAvailableModels", () => ({
  useAvailableModels: () => ({
    models: [{ id: "fast-model", name: "Fast model" }],
    loading: false,
    refetch: vi.fn(),
  }),
}));

type GeneratedCard = GeneratedSetPayload["cards"][number] & { selected: boolean };

const cards: GeneratedCard[] = [
  {
    fields: { Front: "hola", Back: "hello" },
    rationale: "A greeting.",
    selected: true,
  },
  {
    fields: { Front: "adios", Back: "goodbye" },
    selected: false,
  },
];

function renderPreview({
  onCardsChange = vi.fn(),
  onBack = vi.fn(),
  onConfirm = vi.fn(),
  onRefine = vi.fn().mockResolvedValue({ kind: "applied" }),
  isRefining = false,
  isBusy = false,
}: {
  onCardsChange?: (cards: GeneratedCard[]) => void;
  onBack?: () => void;
  onConfirm?: () => void;
  onRefine?: React.ComponentProps<typeof GeneratePreview>["onRefine"];
  isRefining?: boolean;
  isBusy?: boolean;
} = {}) {
  render(
    <GeneratePreview
      cards={cards}
      selectedCount={1}
      onCardsChange={onCardsChange}
      onBack={onBack}
      onConfirm={onConfirm}
      onRefine={onRefine}
      refinementModel="fast-model"
      onRefinementModelChange={vi.fn()}
      isRefining={isRefining}
      isBusy={isBusy}
    />,
  );
}

function ControlledPreview({
  onCardsChange,
}: {
  onCardsChange: (cards: GeneratedCard[]) => void;
}) {
  const [draftCards, setDraftCards] = useState(cards);
  const selectedCount = draftCards.filter((card) => card.selected).length;

  return (
    <GeneratePreview
      cards={draftCards}
      selectedCount={selectedCount}
      onCardsChange={(updatedCards) => {
        setDraftCards(updatedCards);
        onCardsChange(updatedCards);
      }}
      onBack={vi.fn()}
      onConfirm={vi.fn()}
      onRefine={vi.fn().mockResolvedValue({ kind: "applied" })}
      refinementModel="fast-model"
      onRefinementModelChange={vi.fn()}
    />
  );
}

describe("GeneratePreview", () => {
  it("updates draft cards when include toggles and fields are edited", async () => {
    const user = userEvent.setup();
    const onCardsChange = vi.fn();
    render(<ControlledPreview onCardsChange={onCardsChange} />);

    expect(screen.getByText("1 of 2 cards included")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Include card 2 in set" }));

    expect(onCardsChange).toHaveBeenLastCalledWith([
      cards[0],
      {
        ...cards[1],
        selected: true,
      },
    ]);

    const backField = screen.getByDisplayValue("hello");
    await user.clear(backField);
    await user.type(backField, "hi");

    expect(onCardsChange).toHaveBeenLastCalledWith([
      {
        ...cards[0],
        fields: { Front: "hola", Back: "hi" },
      },
      {
        ...cards[1],
        selected: true,
      },
    ]);
  });

  it("disables preview actions and card edits while refining", () => {
    renderPreview({ isRefining: true });

    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create Set (1 cards)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "..." })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Include card 1 in set" })).toBeDisabled();
    expect(screen.getByDisplayValue("hola")).toBeDisabled();
  });

  it("disables navigation, confirmation, refinement, and card edits while busy", () => {
    renderPreview({ isBusy: true });

    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create Set (1 cards)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refine Draft" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Include card 1 in set" })).toBeDisabled();
    expect(screen.getByDisplayValue("hola")).toBeDisabled();
  });

  it("disables confirmation when no cards are included", () => {
    render(
      <GeneratePreview
        cards={cards.map((card) => ({ ...card, selected: false }))}
        selectedCount={0}
        onCardsChange={vi.fn()}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
        refinementModel=""
        onRefinementModelChange={vi.fn()}
      />,
    );

    expect(screen.getByText("0 of 2 cards included")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Set (0 cards)" })).toBeDisabled();
  });
});
