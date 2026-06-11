"use client";

import { useState } from "react";
import type { FieldDefinition } from "@/lib/types";
import type { TtsEvent } from "@/lib/tts";
import { speakSequence } from "@/lib/tts";
import { isTtsProblem, useTtsInteraction } from "@/hooks/useTtsInteraction";
import AnnotationControls from "./AnnotationControls";
import FieldContent from "./FieldContent";
import { getRevealTtsItems } from "./studyCardTts";

type Props = {
  card: { fields: Record<string, string> };
  fieldDefinitions: FieldDefinition[];
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields?: string[];
  onRevealed?: () => void;
  autoPlayTts?: boolean;
  ttsRate?: number;
  annotation?: { flagged: boolean; note?: string };
  onToggleFlag?: () => void;
  onSetNote?: (note: string) => void;
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
  annotation,
  onToggleFlag,
  onSetNote,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const { message: ttsMessage, setMessage: setTtsMessage } = useTtsInteraction();

  const fieldDefsMap = new Map(fieldDefinitions.map((fd) => [fd.name, fd]));

  const updateTtsStatus = (event: TtsEvent) => {
    if (isTtsProblem(event.status)) {
      setTtsMessage(
        "message" in event
          ? event.message
          : "Couldn't play audio. Check volume or tap again.",
      );
      return;
    }

    setTtsMessage(null);
  };

  const handleReveal = () => {
    setRevealed(true);
    onRevealed?.();

    if (autoPlayTts) {
      const items = getRevealTtsItems({
        cardFields: card.fields,
        fieldDefinitions,
        backFields,
        ttsOnlyFields,
      });
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
      <div className="bg-card-bg border-2 border-card-border rounded-xl p-4 sm:p-8 shadow-sm">
        <FieldContent
          fieldNames={frontFields}
          fields={card.fields}
          fieldDefsMap={fieldDefsMap}
          primaryClassName="text-2xl sm:text-4xl font-bold"
          secondaryClassName="text-xl sm:text-2xl"
          ttsRate={ttsRate}
          onTtsEvent={updateTtsStatus}
        />

        {revealed ? (
          <>
            <hr className="my-6 border-dashed" />
            <FieldContent
              fieldNames={backFields}
              fields={card.fields}
              fieldDefsMap={fieldDefsMap}
              primaryClassName="text-xl sm:text-3xl font-bold"
              secondaryClassName="text-lg sm:text-xl"
              ttsRate={ttsRate}
              onTtsEvent={updateTtsStatus}
            />
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

        {revealed && (onToggleFlag ?? onSetNote) && (
          <AnnotationControls
            annotation={annotation}
            onToggleFlag={onToggleFlag}
            onSetNote={onSetNote}
          />
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
