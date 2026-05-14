"use client";

import { useState } from "react";

type Props = {
  annotation?: { flagged: boolean; note?: string };
  onToggleFlag?: () => void;
  onSetNote?: (note: string) => void;
};

export default function AnnotationControls({
  annotation,
  onToggleFlag,
  onSetNote,
}: Props) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(annotation?.note ?? "");

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            className={`text-sm transition-colors ${annotation?.flagged ? "text-amber-500" : "text-muted hover:text-foreground"}`}
            aria-label={annotation?.flagged ? "Unflag card" : "Flag card"}
          >
            {annotation?.flagged ? "★ Flagged" : "☆ Flag"}
          </button>
        )}
        {onSetNote && (
          <button
            type="button"
            onClick={() => setShowNoteInput((v) => !v)}
            className={`text-sm transition-colors ${annotation?.note ? "text-accent" : "text-muted hover:text-foreground"}`}
            aria-label={annotation?.note ? "Edit note" : "Add note"}
          >
            {annotation?.note ? "✎ Note" : "+ Note"}
          </button>
        )}
      </div>
      {showNoteInput && onSetNote && (
        <div className="w-full max-w-sm">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => onSetNote(noteText)}
            placeholder="Add a personal note or mnemonic..."
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent border-edge resize-none"
          />
        </div>
      )}
      {!showNoteInput && annotation?.note && (
        <p className="text-xs text-muted italic max-w-sm text-center">
          {annotation.note}
        </p>
      )}
    </div>
  );
}
