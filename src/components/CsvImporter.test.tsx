import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CsvImporter from "./CsvImporter";
import CsvPath from "./wizard/CsvPath";
import type { WizardState } from "./wizard/wizardState";

function csvFile(contents: string, name = "cards.csv"): File {
  return new File([contents], name, { type: "text/csv" });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("CSV file input was not rendered");
  }
  return input;
}

function dropZone(): HTMLElement {
  const prompt = screen.getByText("Drop a CSV file here or click to browse");
  const zone = prompt.closest("div");
  if (!(zone instanceof HTMLElement)) {
    throw new Error("CSV drop zone was not rendered");
  }
  return zone;
}

async function uploadCsv(container: HTMLElement, contents: string): Promise<void> {
  await userEvent.upload(fileInput(container), csvFile(contents));
}

describe("CsvImporter", () => {
  it("previews a selected CSV file and confirms the parsed import", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const { container } = render(<CsvImporter onImport={onImport} />);

    await uploadCsv(container, "Character,Meaning\n你,you\n好,good");

    expect(await screen.findByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("2 cards with 2 fields")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Character" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "你" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import 2 Cards" }));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        cards: [
          { Character: "你", Meaning: "you" },
          { Character: "好", Meaning: "good" },
        ],
      }),
    );
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("shows row warnings and clears the preview when canceled", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const { container } = render(<CsvImporter onImport={onImport} />);

    await uploadCsv(container, "Character,Meaning\n你,you\n,\n好,good");

    const preview = await screen.findByText("Preview");
    expect(preview).toBeInTheDocument();
    expect(screen.getByText("Warnings:")).toBeInTheDocument();
    expect(screen.getByText("Row 3: empty row skipped")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Warnings:")).not.toBeInTheDocument();
    expect(fileInput(container).value).toBe("");
    expect(onImport).not.toHaveBeenCalled();
  });

  it("shows blocking parse errors without exposing a confirm action", async () => {
    const { container } = render(<CsvImporter onImport={vi.fn()} />);

    await uploadCsv(container, "");

    expect(await screen.findByText("No columns found")).toBeInTheDocument();
    expect(screen.getByText("0 cards with 0 fields")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Import/i })).not.toBeInTheDocument();
  });

  it("handles drag state and rejects non-CSV drops", async () => {
    render(<CsvImporter onImport={vi.fn()} />);
    const zone = dropZone();

    fireEvent.dragOver(zone);
    expect(zone.className).toContain("border-accent");

    fireEvent.drop(zone, {
      dataTransfer: { files: [csvFile("not,csv", "cards.txt")] },
    });

    expect(zone.className).not.toContain("border-accent");
    expect(await screen.findByText("Please drop a .csv file.")).toBeInTheDocument();
  });

  it("opens the hidden file input from the visible drop zone", async () => {
    const user = userEvent.setup();
    const { container } = render(<CsvImporter onImport={vi.fn()} />);
    const input = fileInput(container);
    const clickInput = vi.spyOn(input, "click").mockImplementation(() => undefined);

    expect(input).toHaveClass("hidden");
    expect(input).toHaveAttribute("accept", ".csv");

    await user.click(dropZone());

    expect(clickInput).toHaveBeenCalledTimes(1);
    clickInput.mockRestore();
  });
});

describe("CsvPath", () => {
  it("dispatches imported cards and field definitions after a confirmed CSV import", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state: WizardState = {
      step: 2,
      name: "Chinese",
      description: "",
      sourceMethod: "csv",
      fieldDefinitions: [],
      cards: [],
    };
    const { container } = render(<CsvPath state={state} dispatch={dispatch} />);

    await uploadCsv(container, "Character,Meaning\n你,you");
    await user.click(await screen.findByRole("button", { name: "Import 1 Cards" }));

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "SET_CARDS",
      payload: [{ fields: { Character: "你", Meaning: "you" } }],
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "SET_FIELD_DEFINITIONS",
      payload: [
        expect.objectContaining({ name: "Character", role: "primary", order: 0 }),
        expect.objectContaining({ name: "Meaning", role: "definition", order: 1 }),
      ],
    });
  });

  it("shows the ready state for previously imported CSV cards", () => {
    const state: WizardState = {
      step: 2,
      name: "Chinese",
      description: "",
      sourceMethod: "csv",
      fieldDefinitions: [
        { name: "Character", role: "primary", metadata: {}, order: 0 },
        { name: "Meaning", role: "definition", metadata: {}, order: 1 },
      ],
      cards: [{ fields: { Character: "你", Meaning: "you" } }],
    };

    render(<CsvPath state={state} dispatch={vi.fn()} />);

    expect(screen.getByText("1 cards ready with 2 fields")).toBeInTheDocument();
  });
});
