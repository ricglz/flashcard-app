import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import { cancelTts, speakSequence } from "@/lib/tts";
import StudyCard from "./StudyCard";

vi.mock("@/lib/tts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tts")>();
  return {
    ...actual,
    speakSequence: vi.fn(() => Promise.resolve({ ok: true, status: "ended" })),
    cancelTts: vi.fn(),
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

const fieldDefinitionsWithFrontTts: FieldDefinition[] = [
  { name: "Front", role: "primary", metadata: { tts: { lang: "en-US" } }, order: 0 },
  { name: "Back", role: "definition", metadata: { tts: { lang: "ja-JP" } }, order: 1 },
  {
    name: "Pronunciation",
    role: "pronunciation",
    metadata: { tts: { lang: "ja-JP" } },
    order: 2,
  },
];

describe("StudyCard front autoplay", () => {
  it("autoplays front TTS fields on mount", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    speakSequenceMock.mockClear();

    render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer", Pronunciation: "pronunciation" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        ttsOnlyFields={["Pronunciation"]}
        autoPlayTts
        ttsRate={0.9}
      />,
    );

    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "question", lang: "en-US" }],
      expect.objectContaining({ rate: 0.9 }),
    );
  });

  it("does not autoplay front when muted", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    const cancelTtsMock = vi.mocked(cancelTts);
    speakSequenceMock.mockClear();
    cancelTtsMock.mockClear();

    render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts={false}
      />,
    );

    expect(speakSequenceMock).not.toHaveBeenCalled();
    expect(cancelTtsMock).toHaveBeenCalled();
  });

  it("does not autoplay front when no TTS config", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    const cancelTtsMock = vi.mocked(cancelTts);
    speakSequenceMock.mockClear();
    cancelTtsMock.mockClear();

    render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitions}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    expect(speakSequenceMock).not.toHaveBeenCalled();
    expect(cancelTtsMock).toHaveBeenCalled();
  });

  it("cancels TTS on unmount", async () => {
    const cancelTtsMock = vi.mocked(cancelTts);
    cancelTtsMock.mockClear();

    const { unmount } = render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    unmount();

    expect(cancelTtsMock).toHaveBeenCalled();
  });

  it("cancels TTS when autoPlayTts toggles off and replays when toggled on", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    const cancelTtsMock = vi.mocked(cancelTts);
    speakSequenceMock.mockClear();
    cancelTtsMock.mockClear();

    const { rerender } = render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    expect(speakSequenceMock).toHaveBeenCalledTimes(1);

    rerender(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts={false}
      />,
    );

    expect(cancelTtsMock).toHaveBeenCalled();

    speakSequenceMock.mockClear();
    cancelTtsMock.mockClear();

    rerender(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "question", lang: "en-US" }],
      expect.any(Object),
    );
  });
});

describe("StudyCard reveal", () => {
  it("reveals back fields and autoplays configured TTS fields", async () => {
    const user = userEvent.setup();
    const onRevealed = vi.fn();
    const speakSequenceMock = vi.mocked(speakSequence);
    speakSequenceMock.mockClear();

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

  it("does not replay front TTS on reveal when parent rerenders with new array references", async () => {
    const user = userEvent.setup();
    const speakSequenceMock = vi.mocked(speakSequence);
    const cancelTtsMock = vi.mocked(cancelTts);
    speakSequenceMock.mockClear();
    cancelTtsMock.mockClear();

    const { rerender } = render(
      <StudyCard
        card={{ fields: { Front: "front", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    expect(speakSequenceMock).toHaveBeenCalledTimes(1);
    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "front", lang: "en-US" }],
      expect.any(Object),
    );

    speakSequenceMock.mockClear();
    cancelTtsMock.mockClear();

    // Simulate parent rerender on reveal with new array instances but same content
    rerender(
      <StudyCard
        card={{ fields: { Front: "front", Back: "answer" } }}
        fieldDefinitions={[...fieldDefinitionsWithFrontTts]}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    // Front should NOT replay on prop reference change alone
    expect(speakSequenceMock).not.toHaveBeenCalled();
    expect(cancelTtsMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));

    // Back should play, not front again
    expect(speakSequenceMock).toHaveBeenCalledTimes(1);
    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "answer", lang: "ja-JP" }],
      expect.any(Object),
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
