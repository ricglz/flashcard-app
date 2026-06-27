import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { FieldDefinition } from "@/lib/types";
import { cancelTts, speakSequence } from "@/lib/tts";
import type { TtsEvent } from "@/lib/tts";
import StudyCard from "./StudyCard";

vi.mock("@/lib/tts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tts")>();
  return {
    ...actual,
    speakSequence: vi.fn(() => Promise.resolve({ ok: true, status: "ended" })),
    cancelTts: vi.fn(),
    ensureVoices: vi.fn(() => Promise.resolve([])),
  };
});

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

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

    await flush();

    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "question", lang: "en-US", itemId: "Front" }],
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

    await flush();
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

    await flush();
    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "question", lang: "en-US", itemId: "Front" }],
      expect.any(Object),
    );
  });
});

describe("StudyCard reveal", () => {
  it("shows token annotation tooltips only after reveal and never for front fields", async () => {
    const user = userEvent.setup();

    render(
      <StudyCard
        card={{
          fields: { Front: "你", Back: "好" },
          tokenAnnotations: {
            Front: [{ start: 0, end: 1, gloss: "you" }],
            Back: [{ start: 0, end: 1, gloss: "good" }],
          },
        }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
      />,
    );

    expect(screen.queryByText("you")).not.toBeInTheDocument();
    expect(screen.queryByText("good")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reveal Answer" }));

    expect(screen.queryByText("you")).not.toBeInTheDocument();
    expect(screen.getByText("good")).toBeInTheDocument();
  });

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
        { text: "answer", lang: "ja-JP", itemId: "Back" },
        { text: "pronunciation", lang: "ja-JP", itemId: "Pronunciation" },
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

    await flush();
    expect(speakSequenceMock).toHaveBeenCalledTimes(1);
    expect(speakSequenceMock).toHaveBeenCalledWith(
      [{ text: "front", lang: "en-US", itemId: "Front" }],
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
      [{ text: "answer", lang: "ja-JP", itemId: "Back" }],
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

describe("StudyCard auto TTS visual indicator", () => {
  it("highlights TtsButton during speaking and clears on ended", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    let onEvent: ((e: TtsEvent) => void) | undefined;
    speakSequenceMock.mockImplementation((_items, options) => {
      onEvent = (options as { onEvent?: (e: TtsEvent) => void }).onEvent;
      return Promise.resolve({ ok: true, status: "ended" });
    });

    render(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );

    await flush();
    expect(speakSequenceMock).toHaveBeenCalled();
    expect(onEvent).toBeDefined();

    const button = screen.getByRole("button", { name: /Front pronunciation/i });
    expect(button).toHaveAttribute("aria-label", "Listen to Front pronunciation");

    // simulate speaking
    act(() => {
      onEvent!({ status: "speaking", itemId: "Front", text: "question", lang: "en-US" });
    });
    await waitFor(() => expect(button).toHaveAttribute("aria-label", "Playing Front pronunciation"));
    expect(button.className).toContain("bg-accent");

    // simulate ended
    act(() => {
      onEvent!({ status: "ended", itemId: "Front", text: "question", lang: "en-US" });
    });
    await waitFor(() => expect(button).toHaveAttribute("aria-label", "Listen to Front pronunciation"));
    expect(button.className).not.toContain("bg-accent");
  });

  it("clears highlight on error and on toggle off", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    const cancelTtsMock = vi.mocked(cancelTts);
    let onEvent: ((e: TtsEvent) => void) | undefined;
    speakSequenceMock.mockImplementation((_items, options) => {
      onEvent = (options as { onEvent?: (e: TtsEvent) => void }).onEvent;
      return Promise.resolve({ ok: true, status: "ended" });
    });
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

    await flush();
    const button = screen.getByRole("button", { name: /Front pronunciation/i });
    act(() => {
      onEvent!({ status: "speaking", itemId: "Front", text: "question", lang: "en-US" });
    });
    await waitFor(() => expect(button.className).toContain("bg-accent"));

    act(() => {
      onEvent!({ status: "error", itemId: "Front", kind: "unknown", message: "err", text: "question", lang: "en-US" });
    });
    await waitFor(() => expect(button.className).not.toContain("bg-accent"));

    // speaking again then toggle off
    act(() => {
      onEvent!({ status: "speaking", itemId: "Front", text: "question", lang: "en-US" });
    });
    await waitFor(() => expect(button.className).toContain("bg-accent"));

    rerender(
      <StudyCard
        card={{ fields: { Front: "question", Back: "answer" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts={false}
      />,
    );
    await flush();
    expect(cancelTtsMock).toHaveBeenCalled();
    await waitFor(() => expect(button.className).not.toContain("bg-accent"));
  });

  it("clears old highlight immediately on new run and ignores stale events", async () => {
    const speakSequenceMock = vi.mocked(speakSequence);
    let firstOnEvent: ((e: TtsEvent) => void) | undefined;
    let secondOnEvent: ((e: TtsEvent) => void) | undefined;
    speakSequenceMock
      .mockImplementationOnce((_items, options) => {
        firstOnEvent = (options as { onEvent?: (e: TtsEvent) => void }).onEvent;
        return Promise.resolve({ ok: true, status: "ended" });
      })
      .mockImplementationOnce((_items, options) => {
        secondOnEvent = (options as { onEvent?: (e: TtsEvent) => void }).onEvent;
        return Promise.resolve({ ok: true, status: "ended" });
      });

    const { rerender } = render(
      <StudyCard
        card={{ fields: { Front: "a", Back: "b" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );
    await flush();
    act(() => {
      firstOnEvent!({ status: "speaking", itemId: "Front", text: "a", lang: "en-US" });
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Front pronunciation/i }).className).toContain("bg-accent"));
    const buttonA = screen.getByRole("button", { name: /Front pronunciation/i });

    // new run via card change
    rerender(
      <StudyCard
        card={{ fields: { Front: "c", Back: "d" } }}
        fieldDefinitions={fieldDefinitionsWithFrontTts}
        frontFields={["Front"]}
        backFields={["Back"]}
        autoPlayTts
      />,
    );
    await flush();
    // old highlight cleared immediately on new run start
    await waitFor(() => expect(buttonA.className).not.toContain("bg-accent"));

    // stale event from old run ignored
    act(() => {
      firstOnEvent!({ status: "ended", itemId: "Front", text: "a", lang: "en-US" });
    });
    await flush();
    expect(buttonA.className).not.toContain("bg-accent");

    // new run speaking
    act(() => {
      secondOnEvent!({ status: "speaking", itemId: "Front", text: "c", lang: "en-US" });
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Front pronunciation/i }).className).toContain("bg-accent"));
  });
});
