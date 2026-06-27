"use client";

import type { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";
import { hasCjkChars } from "@/lib/cjk";
import type { TokenAnnotations } from "@/lib/types";
import { getAnnotationsForField } from "@/lib/tokenAnnotations";
import type { TtsEvent } from "@/lib/tts";
import TtsButton from "./TtsButton";
import TappableCjkText from "./TappableCjkText";
import TappablePinyinText from "./TappablePinyinText";

type Props = {
  fieldNames: string[];
  fields: Record<string, string>;
  fieldDefsMap: Map<string, FieldDefinition>;
  classNames: {
    primary: string;
    secondary: string;
  };
  ttsRate?: number;
  annotationDisplay: {
    annotations: TokenAnnotations;
    enabled: boolean;
  };
  onTtsEvent: (event: TtsEvent) => void;
  activeFieldId?: string | null;
};

export default function FieldContent({
  fieldNames,
  fields,
  fieldDefsMap,
  classNames,
  ttsRate,
  annotationDisplay,
  onTtsEvent,
  activeFieldId,
}: Props) {
  return (
    <div className="space-y-4">
      {fieldNames.map((fieldName) => {
        const fd = fieldDefsMap.get(fieldName);
        const value = fields[fieldName] ?? "";
        const ttsConfig = fd ? getTtsConfig(fd) : null;
        const annotations = annotationDisplay.enabled
          ? getAnnotationsForField(annotationDisplay.annotations, fieldName)
          : [];
        const textClassName =
          fd?.role === "primary" ? classNames.primary : classNames.secondary;

        return (
          <div key={fieldName} className="text-center">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">
              {fieldName}
            </p>
            <div className="flex items-center justify-center gap-2">
              {ttsConfig && hasCjkChars(value) ? (
                <TappableCjkText
                  text={value}
                  lang={ttsConfig.lang}
                  rate={ttsRate}
                  annotations={annotations}
                  className={textClassName}
                  onTtsEvent={onTtsEvent}
                />
              ) : fd?.role === "pronunciation" ? (
                <TappablePinyinText
                  text={value}
                  lang={ttsConfig?.lang}
                  rate={ttsRate}
                  annotations={annotations}
                  className={textClassName}
                  onTtsEvent={onTtsEvent}
                />
              ) : (
                <p className={textClassName}>{value}</p>
              )}
              {ttsConfig && (
                <TtsButton
                  text={value}
                  lang={ttsConfig.lang}
                  rate={ttsRate}
                  onTtsEvent={onTtsEvent}
                  externalSpeaking={activeFieldId === fieldName}
                  fieldName={fieldName}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
