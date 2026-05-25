"use client";

import type { TtsEvent, TtsStatus } from "@/lib/tts";
import { speak } from "@/lib/tts";
import { useTtsInteraction } from "@/hooks/useTtsInteraction";

function statusClasses(status: TtsStatus): string {
  switch (status) {
    case "preparing":
    case "queued":
      return "rounded bg-accent/10 text-accent animate-pulse";
    case "speaking":
      return "rounded bg-accent/20 text-accent animate-pulse";
    case "error":
    case "timeout":
    case "unsupported":
      return "rounded bg-danger-surface text-danger";
    case "idle":
    case "ended":
    case "cancelled":
      return "";
  }
}

export default function TappableCjkChar({
  char,
  lang,
  rate,
  onTtsEvent,
}: {
  char: string;
  lang: string;
  rate?: number;
  onTtsEvent?: (event: TtsEvent) => void;
}) {
  const { status, handleTtsEvent } = useTtsInteraction({
    onTtsEvent,
    terminalResetMs: 300,
    problemResetMs: 1000,
  });

  const handleClick = () => {
    void speak(char, lang, {
      rate,
      onEvent: handleTtsEvent,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Play ${char}`}
      className={`inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit transition-colors duration-150 ${statusClasses(status)}`}
    >
      {char}
    </button>
  );
}
