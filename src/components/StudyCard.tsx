"use client";

import { useState } from "react";
import { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";
import TtsButton from "./TtsButton";

type Props = {
  card: { fields: Record<string, string> };
  fieldDefinitions: FieldDefinition[];
  frontFields: string[];
  backFields: string[];
  onRevealed?: () => void;
};

export default function StudyCard({
  card,
  fieldDefinitions,
  frontFields,
  backFields,
  onRevealed,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
    onRevealed?.();
  };

  const fieldDefsMap = new Map(fieldDefinitions.map((fd) => [fd.name, fd]));

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Front */}
      <div className="bg-white border-2 rounded-xl p-8 shadow-sm">
        <div className="space-y-4">
          {frontFields.map((fieldName) => {
            const fd = fieldDefsMap.get(fieldName);
            const value = card.fields[fieldName] ?? "";
            const ttsConfig = fd ? getTtsConfig(fd) : null;

            return (
              <div key={fieldName} className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {fieldName}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p
                    className={
                      fd?.role === "primary"
                        ? "text-4xl font-bold"
                        : "text-2xl"
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
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {fieldName}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <p
                        className={
                          fd?.role === "primary"
                            ? "text-3xl font-bold"
                            : "text-xl"
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
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium"
            >
              Reveal Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
