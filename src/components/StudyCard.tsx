"use client";

import { useState } from "react";
import type { FieldDefinition } from "@/lib/types";
import AnnotationControls from "./AnnotationControls";
import FieldContent from "./FieldContent";
import { getTtsPlan } from "./studyCardTts";
import { useStudyCardTts } from "@/hooks/useStudyCardTts";
import { sortedStrings } from "@/lib/objects";

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

// eslint-disable-next-line local/no-large-component-props -- Existing wide component API; reduce before removing this override.
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

  const fieldDefsMap = new Map(fieldDefinitions.map((fd) => [fd.name, fd]));

  const sortedFrontFields = sortedStrings(frontFields);
  const sortedBackFields = sortedStrings(backFields);

  const ttsPlan = getTtsPlan({
    cardFields: card.fields,
    fieldDefinitions,
    frontFields: sortedFrontFields,
    backFields: sortedBackFields,
    ttsOnlyFields,
  });

  const tts = useStudyCardTts({
    frontItems: ttsPlan.frontItems,
    revealItems: ttsPlan.revealItems,
    frontKey: ttsPlan.frontKey,
    revealKey: ttsPlan.revealKey,
    autoPlay: autoPlayTts ?? false,
    rate: ttsRate,
  });

  const handleReveal = () => {
    setRevealed(true);
    onRevealed?.();
    tts.playRevealTts();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-card-bg border-2 border-card-border rounded-xl p-4 sm:p-8 shadow-sm">
        <FieldContent
          fieldNames={sortedFrontFields}
          fields={card.fields}
          fieldDefsMap={fieldDefsMap}
          primaryClassName="text-2xl sm:text-4xl font-bold"
          secondaryClassName="text-xl sm:text-2xl"
          ttsRate={ttsRate}
          onTtsEvent={tts.handleTtsEvent}
          activeFieldId={tts.activeFieldId}
        />

        {revealed ? (
          <>
            <hr className="my-6 border-dashed" />
            <FieldContent
              fieldNames={sortedBackFields}
              fields={card.fields}
              fieldDefsMap={fieldDefsMap}
              primaryClassName="text-xl sm:text-3xl font-bold"
              secondaryClassName="text-lg sm:text-xl"
              ttsRate={ttsRate}
              onTtsEvent={tts.handleTtsEvent}
              activeFieldId={tts.activeFieldId}
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

        {tts.message && (
          <div
            className="mt-4 rounded-lg bg-danger-surface px-3 py-2 text-center text-sm text-danger"
            aria-live="polite"
          >
            {tts.message}
          </div>
        )}
      </div>
    </div>
  );
}