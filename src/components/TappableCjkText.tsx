"use client";

import type { TokenAnnotation } from "@/lib/types";
import { getAnnotationSpans } from "@/lib/tokenAnnotations";
import type { TtsEvent } from "@/lib/tts";
import TappableCjkChar from "./TappableCjkChar";

export default function TappableCjkText({
  text,
  lang,
  rate,
  annotations,
  className,
  onTtsEvent,
}: {
  text: string;
  lang: string;
  rate?: number;
  annotations: TokenAnnotation[];
  className?: string;
  onTtsEvent?: (event: TtsEvent) => void;
}) {
  const spans = getAnnotationSpans(text, annotations);

  return (
    <p className={className}>
      {spans.map((span) => {
        if (span.annotation) {
          return (
            <TappableCjkChar
              key={`${span.start}-${span.end}`}
              text={span.text}
              lang={lang}
              rate={rate}
              annotation={span.annotation}
              onTtsEvent={onTtsEvent}
            />
          );
        }
        return span.isCjk
          ? Array.from(span.text).map((char, index) => (
              <TappableCjkChar
                key={`${span.start + index}-${char}`}
                text={char}
                lang={lang}
                rate={rate}
                onTtsEvent={onTtsEvent}
              />
            ))
          : span.text;
      })}
    </p>
  );
}
