"use client";

import { useRef, useState } from "react";
import type { TtsEvent, TtsStatus } from "@/lib/tts";
import { speak } from "@/lib/tts";

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
      return "rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
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
  const [status, setStatus] = useState<TtsStatus>("idle");
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = () => {
    clearTimeout(resetTimeoutRef.current);
    void speak(char, lang, {
      rate,
      onEvent: (event) => {
        setStatus(event.status);
        onTtsEvent?.(event);
        const isTerminal = event.status === "ended" || event.status === "cancelled";
        const isError = event.status === "error" || event.status === "timeout" || event.status === "unsupported";
        if (isTerminal || isError) {
          resetTimeoutRef.current = setTimeout(() => setStatus("idle"), isError ? 1000 : 300);
        }
      },
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
