"use client";

import type { TtsEvent, TtsStatus } from "@/lib/tts";
import { isTtsSupported, speak } from "@/lib/tts";
import {
  isTtsBusy,
  isTtsProblem,
  useTtsInteraction,
} from "@/hooks/useTtsInteraction";
import TtsButtonIcon from "./TtsButtonIcon";

type Props = {
  text: string;
  lang: string;
  rate?: number;
  className?: string;
  showMessage?: boolean;
  onTtsEvent?: (event: TtsEvent) => void;
  externalSpeaking?: boolean;
  fieldName?: string;
};

function ariaLabel(status: TtsStatus, fieldName?: string): string {
  const base = fieldName ? `${fieldName} pronunciation` : "pronunciation";
  if (status === "speaking") return `Playing ${base}`;
  if (status === "preparing" || status === "queued") {
    return `Preparing ${base}`;
  }
  if (isTtsProblem(status)) return `Could not play ${base}`;
  return `Listen to ${base}`;
}

function buttonClasses(status: TtsStatus, className: string): string {
  const stateClasses = status === "speaking"
    ? "bg-accent text-white shadow-sm"
    : status === "preparing" || status === "queued"
      ? "bg-accent-surface text-accent-surface-text"
      : isTtsProblem(status)
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
  externalSpeaking = false,
  fieldName,
}: Props) {
  const {
    status,
    message,
    setStatus,
    setMessage,
    clearMessage,
    handleTtsEvent,
  } = useTtsInteraction({ onTtsEvent });

  const displayStatus: TtsStatus = isTtsBusy(status)
    ? status
    : externalSpeaking
      ? "speaking"
      : status;

  const handleClick = async () => {
    if (!isTtsSupported()) {
      const event: TtsEvent = {
        status: "unsupported",
        text,
        lang,
        kind: "unsupported_browser",
        message: "Text-to-speech is not supported in this browser.",
      };
      handleTtsEvent(event);
      return;
    }

    clearMessage();

    const result = await speak(text, lang, {
      rate,
      onEvent: handleTtsEvent,
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
        className={buttonClasses(displayStatus, className)}
        title={message ?? `Listen (${lang})`}
        aria-label={ariaLabel(displayStatus, fieldName)}
        aria-busy={isTtsBusy(displayStatus)}
      >
        <TtsButtonIcon status={displayStatus} />
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
