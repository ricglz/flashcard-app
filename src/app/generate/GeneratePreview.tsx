"use client";

import CardPreviewList, { type PreviewCard } from "@/components/CardPreviewList";

type GeneratedCard = PreviewCard & {
  sourceCardIds?: string[];
};

type GeneratePreviewProps = {
  cards: GeneratedCard[];
  selectedCount: number;
  onCardsChange: (cards: GeneratedCard[]) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
};

export default function GeneratePreview({
  cards,
  selectedCount,
  onCardsChange,
  onBack,
  onConfirm,
  confirmLabel,
}: GeneratePreviewProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {selectedCount} of {cards.length} cards selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-edge rounded-lg text-sm hover:bg-surface-hover"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedCount === 0}
            className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {confirmLabel ?? `Create Set (${selectedCount} cards)`}
          </button>
        </div>
      </div>
      <CardPreviewList
        cards={cards}
        onToggle={(idx) => {
          const updated = [...cards];
          updated[idx] = { ...updated[idx]!, selected: !updated[idx]!.selected };
          onCardsChange(updated);
        }}
        onEdit={(idx, key, value) => {
          const updated = [...cards];
          updated[idx] = {
            ...updated[idx]!,
            fields: { ...updated[idx]!.fields, [key]: value },
          };
          onCardsChange(updated);
        }}
      />
    </div>
  );
}
