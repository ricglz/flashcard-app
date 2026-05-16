"use client";

import { segmentCjkText } from "@/lib/cjk";
import type { TtsEvent } from "@/lib/tts";
import TappableCjkChar from "./TappableCjkChar";

export default function TappableCjkText({
  text,
  lang,
  rate,
  className,
  onTtsEvent,
}: {
  text: string;
  lang: string;
  rate?: number;
  className?: string;
  onTtsEvent?: (event: TtsEvent) => void;
}) {
  const segments = segmentCjkText(text);

  return (
    <p className={className}>
      {segments.map((segment, si) =>
        segment.isCjk
          ? Array.from(segment.text).map((char, ci) => (
              <TappableCjkChar
                key={`${si}-${ci}`}
                char={char}
                lang={lang}
                rate={rate}
                onTtsEvent={onTtsEvent}
              />
            ))
          : segment.text
      )}
    </p>
  );
}
