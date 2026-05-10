"use client";

import { useEffect, useState } from "react";
import { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";
import { speakSequence, TtsEvent, TtsStatus } from "@/lib/tts";
import TtsButton from "./TtsButton";

type Props = {
  card: { fields: Record<string, string> };
  fieldDefinitions: FieldDefinition[];
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields?: string[];
  onRevealed?: () => void;
  autoPlayTts?: boolean;
  ttsRate?: number;
};

export default function StudyCard({
  card,
  fieldDefinitions,
  frontFields,
  backFields,
  ttsOnlyFields = [],
  onRevealed,
  autoPlayTts,
  ttsRate,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>("idle");
  const [ttsMessage, setTtsMessage] = useState<string | null>(null);

  const fieldDefsMap = new Map(fieldDefinitions.map((fd) => [fd.name, fd]));

  const updateTtsStatus = (event: TtsEvent) => {
    setTtsStatus(event.status);

    if (
      event.status === "error" ||
      event.status === "timeout" ||
      event.status === "unsupported"
    ) {
      setTtsMessage(
        event.message ?? "Couldn’t play audio. Check volume or tap again.",
      );
      return;
    }

    setTtsMessage(null);
  };

  useEffect(() => {
    if (ttsStatus !== "ended" && ttsStatus !== "cancelled") return;
    const timeout = window.setTimeout(() => setTtsStatus("idle"), 700);
    return () => window.clearTimeout(timeout);
  }, [ttsStatus]);

  const handleReveal = () => {
    setRevealed(true);
    onRevealed?.();

    if (autoPlayTts) {
      const items: { text: string; lang: string }[] = [];
      for (const fieldName of [...backFields, ...ttsOnlyFields]) {
        const fd = fieldDefsMap.get(fieldName);
        const value = card.fields[fieldName];
        const ttsConfig = fd ? getTtsConfig(fd) : null;
        if (ttsConfig && value) {
          items.push({ text: value, lang: ttsConfig.lang });
        }
      }
      if (items.length > 0) {
        void speakSequence(items, {
          rate: ttsRate,
          onEvent: updateTtsStatus,
        });
      }
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Front */}
      <div className="bg-card-bg border-2 border-card-border rounded-xl p-4 sm:p-8 shadow-sm">
        <div className="space-y-4">
          {frontFields.map((fieldName) => {
            const fd = fieldDefsMap.get(fieldName);
            const value = card.fields[fieldName] ?? "";
            const ttsConfig = fd ? getTtsConfig(fd) : null;

            return (
              <div key={fieldName} className="text-center">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">
                  {fieldName}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p
                    className={
                      fd?.role === "primary"
                        ? "text-2xl sm:text-4xl font-bold"
                        : "text-xl sm:text-2xl"
                    }
                  >
                    {value}
                  </p>
                  {ttsConfig && (
                    <TtsButton
                      text={value}
                      lang={ttsConfig.lang}
                      rate={ttsRate}
                      onTtsEvent={updateTtsStatus}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider + Back */}
        {revealed ? (
          <>
            <hr className="my-6 border-dashed" />
            <div className="space-y-4">
              {backFields.map((fieldName) => {
                const fd = fieldDefsMap.get(fieldName);
                const value = card.fields[fieldName] ?? "";
                const ttsConfig = fd ? getTtsConfig(fd) : null;

                return (
                  <div key={fieldName} className="text-center">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">
                      {fieldName}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <p
                        className={
                          fd?.role === "primary"
                            ? "text-xl sm:text-3xl font-bold"
                            : "text-lg sm:text-xl"
                        }
                      >
                        {value}
                      </p>
                      {ttsConfig && (
                        <TtsButton
                          text={value}
                          lang={ttsConfig.lang}
                          rate={ttsRate}
                          onTtsEvent={updateTtsStatus}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-6 text-center">
            <button
              onClick={handleReveal}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-colors"
            >
              Reveal Answer
            </button>
          </div>
        )}

        {ttsMessage && (
          <div
            className="mt-4 rounded-lg bg-danger-surface px-3 py-2 text-center text-sm text-danger"
            aria-live="polite"
          >
            {ttsMessage}
          </div>
        )}
      </div>
    </div>
  );
}
