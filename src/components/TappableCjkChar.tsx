"use client";

import { useEffect, useState } from "react";
import { speak, TtsEvent, TtsStatus } from "@/lib/tts";

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

  useEffect(() => {
    if (status !== "ended" && status !== "cancelled") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 300);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const handleClick = () => {
    void speak(char, lang, {
      rate,
      onEvent: (event) => {
        setStatus(event.status);
        onTtsEvent?.(event);
      },
    });
  };

  const isSpeaking = status === "speaking";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Play ${char}`}
      className={`inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit transition-colors duration-150 ${
        isSpeaking ? "rounded bg-accent/20" : ""
      }`}
    >
      {char}
    </button>
  );
}
