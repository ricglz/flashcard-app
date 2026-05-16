"use client";

import { useRef, useState } from "react";
import type {
  TtsEvent,
  TtsStatus} from "@/lib/tts";
import {
  isTtsSupported,
  speak
} from "@/lib/tts";
import TtsButtonIcon from "./TtsButtonIcon";

type Props = {
  text: string;
  lang: string;
  rate?: number;
  className?: string;
  showMessage?: boolean;
  onTtsEvent?: (event: TtsEvent) => void;
};

function isBusy(status: TtsStatus): boolean {
  return status === "preparing" || status === "queued" || status === "speaking";
}

function isProblem(status: TtsStatus): boolean {
  return status === "unsupported" || status === "timeout" || status === "error";
}

function ariaLabel(status: TtsStatus): string {
  if (status === "speaking") return "Playing pronunciation";
  if (status === "preparing" || status === "queued") return "Preparing pronunciation";
  if (isProblem(status)) return "Could not play pronunciation";
  return "Listen to pronunciation";
}

function buttonClasses(status: TtsStatus, className: string): string {
  const stateClasses = status === "speaking"
    ? "bg-accent text-white shadow-sm"
    : status === "preparing" || status === "queued"
      ? "bg-accent-surface text-accent-surface-text"
      : isProblem(status)
        ? "bg-danger-surface text-danger border border-danger/40"
        : "hover:bg-surface-hover";

  return `inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full transition-colors ${stateClasses} ${className}`;
}

export default function TtsButton({
  text,
  lang,
  rate,
  className = "",
  showMessage = false,
  onTtsEvent,
}: Props) {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = async () => {
    if (!isTtsSupported()) {
      const event: TtsEvent = {
        status: "unsupported",
        text,
        lang,
        message: "Text-to-speech is not supported in this browser.",
      };
      setStatus(event.status);
      setMessage(event.message ?? null);
      onTtsEvent?.(event);
      return;
    }

    setMessage(null);

    const result = await speak(text, lang, {
      rate,
      onEvent: (event) => {
        setStatus(event.status);
        if (event.message) setMessage(event.message);
        onTtsEvent?.(event);
        if (event.status === "ended" || event.status === "cancelled") {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = setTimeout(() => setStatus("idle"), 700);
        }
      },
    });

    if (!result.ok) {
      setStatus(result.status);
      setMessage(result.message);
    }
  };

  return (
    <span className="inline-flex flex-col items-center gap-1 align-middle">
      <button
        type="button"
        onClick={handleClick}
        className={buttonClasses(status, className)}
        title={message ?? `Listen (${lang})`}
        aria-label={ariaLabel(status)}
        aria-busy={isBusy(status)}
      >
        <TtsButtonIcon status={status} />
      </button>
      {showMessage && message && (
        <span
          className="max-w-40 text-center text-xs text-muted"
          aria-live="polite"
        >
          {message}
        </span>
      )}
    </span>
  );
}
