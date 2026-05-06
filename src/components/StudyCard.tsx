"use client";

import { useState } from "react";
import { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";
import { speakSequence } from "@/lib/tts";
import TtsButton from "./TtsButton";

type Props = {
  card: { fields: Record<string, string> };
  fieldDefinitions: FieldDefinition[];
  frontFields: string[];
  backFields: string[];
  onRevealed?: () => void;
  autoPlayTts?: boolean;
  ttsRate?: number;
};

export default function StudyCard({
  card,
  fieldDefinitions,
  frontFields,
  backFields,
  onRevealed,
  autoPlayTts,
  ttsRate,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
    onRevealed?.();

    if (autoPlayTts) {
      const items: { text: string; lang: string }[] = [];
      for (const fieldName of backFields) {
        const fd = fieldDefsMap.get(fieldName);
        const value = card.fields[fieldName];
        const ttsConfig = fd ? getTtsConfig(fd) : null;
        if (ttsConfig && value) {
          items.push({ text: value, lang: ttsConfig.lang });
        }
      }
      if (items.length > 0) speakSequence(items, ttsRate);
    }
  };

  const fieldDefsMap = new Map(fieldDefinitions.map((fd) => [fd.name, fd]));

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
                    <TtsButton text={value} lang={ttsConfig.lang} rate={ttsRate} />
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
                        <TtsButton text={value} lang={ttsConfig.lang} />
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
      </div>
    </div>
  );
}
