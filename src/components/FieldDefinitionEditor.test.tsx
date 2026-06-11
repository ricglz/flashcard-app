import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import FieldDefinitionEditor from "./FieldDefinitionEditor";

const initialFields: FieldDefinition[] = [
  { name: "Front", role: "primary", metadata: {}, order: 0 },
  { name: "Back", role: "definition", metadata: {}, order: 1 },
];

function ControlledFieldDefinitionEditor({
  fields = initialFields,
  onChange = vi.fn(),
  readOnlyNames,
  allowAddRemove,
}: {
  fields?: FieldDefinition[];
  onChange?: (fields: FieldDefinition[]) => void;
  readOnlyNames?: boolean;
  allowAddRemove?: boolean;
}) {
  const [value, setValue] = useState(fields);

  return (
    <FieldDefinitionEditor
      value={value}
      onChange={(updated) => {
        setValue(updated);
        onChange(updated);
      }}
      readOnlyNames={readOnlyNames}
      allowAddRemove={allowAddRemove}
    />
  );
}

function nthElement<T extends Element>(elements: T[], index: number): T {
  const element = elements[index];
  if (!element) throw new Error(`Expected element at index ${index}`);
  return element;
}

describe("FieldDefinitionEditor", () => {
  it("adds trimmed fields and removes fields through user controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledFieldDefinitionEditor onChange={onChange} />);

    await user.type(screen.getByPlaceholderText("New field name..."), " Example ");
    await user.click(screen.getByRole("button", { name: "Add Field" }));

    expect(screen.getByDisplayValue("Example")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New field name...")).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith([
      ...initialFields,
      { name: "Example", role: "primary", metadata: {}, order: 2 },
    ]);

    await user.click(nthElement(screen.getAllByRole("button", { name: "X" }), 0));

    expect(screen.queryByDisplayValue("Front")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith([
      { name: "Back", role: "definition", metadata: {}, order: 0 },
      { name: "Example", role: "primary", metadata: {}, order: 1 },
    ]);
  });

  it("edits field names and roles", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledFieldDefinitionEditor onChange={onChange} />);

    const frontNameInput = screen.getByDisplayValue("Front");
    await user.clear(frontNameInput);
    await user.type(frontNameInput, "Character");
    await user.selectOptions(
      nthElement(screen.getAllByRole("combobox"), 0),
      "pronunciation",
    );

    expect(onChange).toHaveBeenLastCalledWith([
      { name: "Character", role: "pronunciation", metadata: {}, order: 0 },
      initialFields[1],
    ]);
  });

  it("toggles TTS metadata and edits the language", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledFieldDefinitionEditor onChange={onChange} />);

    await user.click(nthElement(screen.getAllByRole("checkbox", { name: "TTS" }), 1));

    expect(screen.getByPlaceholderText("lang")).toHaveValue("en");
    expect(onChange).toHaveBeenLastCalledWith([
      initialFields[0],
      { ...initialFields[1], metadata: { tts: { lang: "en" } } },
    ]);

    await user.clear(screen.getByPlaceholderText("lang"));
    await user.type(screen.getByPlaceholderText("lang"), "ja-JP");

    expect(onChange).toHaveBeenLastCalledWith([
      initialFields[0],
      { ...initialFields[1], metadata: { tts: { lang: "ja-JP" } } },
    ]);

    await user.click(nthElement(screen.getAllByRole("checkbox", { name: "TTS" }), 1));

    expect(screen.queryByPlaceholderText("lang")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(initialFields);
  });

  it("renders read-only names without name inputs", () => {
    render(<ControlledFieldDefinitionEditor readOnlyNames />);

    expect(screen.getByText("Front")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Front")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Back")).not.toBeInTheDocument();
  });

  it("hides add and remove controls when add/remove is disabled", () => {
    render(<ControlledFieldDefinitionEditor allowAddRemove={false} />);

    expect(screen.queryByRole("button", { name: "Add Field" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("New field name...")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "X" })).not.toBeInTheDocument();
  });
});
