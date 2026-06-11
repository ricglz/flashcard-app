import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import { speakSequence } from "@/lib/tts";
import StudyCard from "./StudyCard";

vi.mock("@/lib/tts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tts")>();
  return {
    ...actual,
    speakSequence: vi.fn(() => Promise.resolve({ ok: true, status: "ended" })),
  };
});

const fieldDefinitions: FieldDefinition[] = [
  { name: "Front", role: "primary", metadata: {}, order: 0 },
  { name: "Back", role: "definition", metadata: { tts: { lang: "ja-JP" } }, order: 1 },
  {
    name: "Pronunciation",
    role: "pronunciation",
    metadata: { tts: { lang: "ja-JP" } },
    order: 2,
  },
];

describe("StudyCard", () => {
  it("reveals back fields and autoplays configured TTS fields", async () => {
    const user = userEvent.setup();
    const onRevealed = vi.fn();
    const speakSequenceMock = vi.mocked(speakSequence);

    render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer", Pronunciation: "pronunciation" } }}
        fieldDefinitions={fieldDefinitions}
        frontFields={["Front"]}
        backFields={["Back"]}
        ttsOnlyFields={["Pronunciation"]}
        onRevealed={onRevealed}
        autoPlayTts
        ttsRate={1.25}
      />,
    );

    expect(screen.getByText("question")).toBeInTheDocument();
    expect(screen.queryByText("answer")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));

    expect(screen.getByText("answer")).toBeInTheDocument();
    expect(onRevealed).toHaveBeenCalledTimes(1);
    expect(speakSequenceMock).toHaveBeenCalledWith(
      [
        { text: "answer", lang: "ja-JP" },
        { text: "pronunciation", lang: "ja-JP" },
      ],
      expect.objectContaining({ rate: 1.25 }),
    );
  });

  it("shows annotation controls only after reveal", async () => {
    const user = userEvent.setup();
    const onToggleFlag = vi.fn();
    const onSetNote = vi.fn();

    render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitions}
        frontFields={["Front"]}
        backFields={["Back"]}
        annotation={{ flagged: false }}
        onToggleFlag={onToggleFlag}
        onSetNote={onSetNote}
      />,
    );

    expect(screen.queryByRole("button", { name: "Flag card" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));
    await user.click(screen.getByRole("button", { name: "Flag card" }));
    await user.click(screen.getByRole("button", { name: "Add note" }));

    const noteInput = screen.getByRole("textbox");
    await user.type(noteInput, "mnemonic");
    await user.tab();

    expect(onToggleFlag).toHaveBeenCalledTimes(1);
    expect(onSetNote).toHaveBeenCalledWith("mnemonic");
  });
});
