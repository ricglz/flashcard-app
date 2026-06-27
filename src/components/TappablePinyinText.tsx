"use client";

import { tokenizeNonWhitespace } from "@/lib/textTokens";
import { getAnnotationSpans } from "@/lib/tokenAnnotations";
import type { TokenAnnotation } from "@/lib/types";
import type { TtsEvent } from "@/lib/tts";
import TappablePinyinToken from "./TappablePinyinToken";

export default function TappablePinyinText({
  text,
  lang,
  rate,
  annotations,
  className,
  onTtsEvent,
}: {
  text: string;
  lang?: string;
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
            <TappablePinyinToken
              key={`${span.start}-${span.end}`}
              text={span.text}
              lang={lang}
              rate={rate}
              annotation={span.annotation}
              onTtsEvent={onTtsEvent}
            />
          );
        }

        const chars = Array.from(span.text);
        const tokens = tokenizeNonWhitespace(span.text);
        if (tokens.length === 0) {
          return <span key={`${span.start}-${span.end}`}>{span.text}</span>;
        }

        return tokens.map((token, index) => {
          const previousEnd = index === 0 ? 0 : tokens[index - 1]?.end ?? 0;
          const gap = chars.slice(previousEnd, token.start).join("");
          const trailing = index === tokens.length - 1
            ? chars.slice(token.end).join("")
            : "";
          return (
            <span key={`${span.start + token.start}-${span.start + token.end}`}>
              {gap}
              <TappablePinyinToken
                text={token.text}
                lang={lang}
                rate={rate}
                onTtsEvent={onTtsEvent}
              />
              {trailing}
            </span>
          );
        });
      })}
    </p>
  );
}
