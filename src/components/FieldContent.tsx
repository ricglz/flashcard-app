"use client";

import { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";
import { hasCjkChars } from "@/lib/cjk";
import { TtsEvent } from "@/lib/tts";
import TtsButton from "./TtsButton";
import TappableCjkText from "./TappableCjkText";

type Props = {
  fieldNames: string[];
  fields: Record<string, string>;
  fieldDefsMap: Map<string, FieldDefinition>;
  /** Text size classes for primary vs non-primary fields */
  primaryClassName: string;
  secondaryClassName: string;
  ttsRate?: number;
  onTtsEvent: (event: TtsEvent) => void;
};

export default function FieldContent({
  fieldNames,
  fields,
  fieldDefsMap,
  primaryClassName,
  secondaryClassName,
  ttsRate,
  onTtsEvent,
}: Props) {
  return (
    <div className="space-y-4">
      {fieldNames.map((fieldName) => {
        const fd = fieldDefsMap.get(fieldName);
        const value = fields[fieldName] ?? "";
        const ttsConfig = fd ? getTtsConfig(fd) : null;
        const textClassName =
          fd?.role === "primary" ? primaryClassName : secondaryClassName;

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
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
