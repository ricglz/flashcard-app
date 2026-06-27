"use client";

import { useId } from "react";
import type { TokenAnnotation } from "@/lib/types";
import type { TtsEvent, TtsStatus } from "@/lib/tts";
import { speak } from "@/lib/tts";
import { useTtsInteraction } from "@/hooks/useTtsInteraction";
import { Tooltip } from "./ui/Tooltip";

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

export default function TappablePinyinToken({
  text,
  lang,
  rate,
  annotation,
  onTtsEvent,
}: {
  text: string;
  lang?: string;
  rate?: number;
  annotation?: TokenAnnotation;
  onTtsEvent?: (event: TtsEvent) => void;
}) {
  const tooltipId = useId();
  const { status, handleTtsEvent } = useTtsInteraction({
    onTtsEvent,
    terminalResetMs: 300,
    problemResetMs: 1000,
  });

  const content = lang ? (
    <button
      type="button"
      onClick={() => {
        void speak(text, lang, { rate, onEvent: handleTtsEvent });
      }}
      aria-label={`Play ${text}`}
      aria-describedby={annotation ? tooltipId : undefined}
      className={`inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit transition-colors duration-150 ${statusClasses(status)}`}
    >
      {text}
    </button>
  ) : (
    <span
      tabIndex={annotation ? 0 : undefined}
      aria-describedby={annotation ? tooltipId : undefined}
      className="outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent"
    >
      {text}
    </span>
  );

  if (!annotation) return content;

  return (
    <span className="relative group inline-block">
      {content}
      <Tooltip id={tooltipId}>
        <span className="block font-medium">{annotation.gloss}</span>
        {annotation.pinyin && (
          <span className="block text-muted">{annotation.pinyin}</span>
        )}
      </Tooltip>
    </span>
  );
}
