"use client";

import { useState } from "react";
import CardPreviewList, { type PreviewCard } from "@/components/CardPreviewList";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";

type GeneratedCard = GeneratedSetPayload["cards"][number] & PreviewCard;

type GeneratePreviewProps = {
  cards: GeneratedCard[];
  selectedCount: number;
  onCardsChange: (cards: GeneratedCard[]) => void;
  onBack: () => void;
  onConfirm: () => void;
  onRefine?: (instructions: string) => void | Promise<void>;
  isRefining?: boolean;
  confirmLabel?: string;
};

export default function GeneratePreview({
  cards,
  selectedCount,
  onCardsChange,
  onBack,
  onConfirm,
  onRefine,
  isRefining = false,
  confirmLabel,
}: GeneratePreviewProps) {
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const canRefine = Boolean(onRefine) && refinementInstructions.trim().length > 0 && !isRefining;

  async function handleRefine() {
    if (!onRefine || !canRefine) return;
    await onRefine(refinementInstructions.trim());
    setRefinementInstructions("");
  }

  return (
    <div className="space-y-4">
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
      {onRefine && (
        <div className="space-y-2 border border-edge rounded-lg p-3">
          <label htmlFor="ai-refinement-instructions" className="block text-sm font-medium">
            Refine cards
          </label>
          <Textarea
            id="ai-refinement-instructions"
            value={refinementInstructions}
            onChange={(event) => setRefinementInstructions(event.target.value)}
            rows={2}
            placeholder="Tell the AI what to improve in this draft."
            disabled={isRefining}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleRefine()}
            disabled={!canRefine}
            loading={isRefining}
          >
            Refine Draft
          </Button>
        </div>
      )}
      <CardPreviewList
        cards={cards}
        onToggle={(idx) => {
          const updated = [...cards];
          const card = updated[idx];
          if (!card) return;
          updated[idx] = { ...card, selected: !card.selected };
          onCardsChange(updated);
        }}
        onEdit={(idx, key, value) => {
          const updated = [...cards];
          const card = updated[idx];
          if (!card) return;
          updated[idx] = {
            ...card,
            fields: { ...card.fields, [key]: value },
          };
          onCardsChange(updated);
        }}
      />
    </div>
  );
}
