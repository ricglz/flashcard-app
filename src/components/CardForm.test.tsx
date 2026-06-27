import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import CardForm from "./CardForm";

const fieldDefinitions: FieldDefinition[] = [
  { name: "Character", role: "primary", metadata: {}, order: 0 },
  { name: "Meaning", role: "definition", metadata: {}, order: 1 },
];

describe("CardForm", () => {
  it("submits fields with token annotations", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<CardForm fieldDefinitions={fieldDefinitions} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText("Enter character..."), "你好");
    await user.type(screen.getByPlaceholderText("Enter meaning..."), "hello");
    await user.click(screen.getByRole("button", { name: "你" }));
    await user.type(screen.getByRole("textbox", { name: "Gloss for 你" }), "you");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Add Card" }));

    expect(onSubmit).toHaveBeenCalledWith(
      { Character: "你好", Meaning: "hello" },
      { Character: [{ start: 0, end: 1, gloss: "you" }] },
    );
  });
});

