"use client";

import CardPreviewList, { type PreviewCard } from "@/components/CardPreviewList";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export default function AiCardPreview({
  cards,
  selectedCount,
  onToggle,
  onEdit,
  onRegenerate,
  onRefine,
  isRefining = false,
}: {
  cards: PreviewCard[];
  selectedCount: number;
  onToggle: (idx: number) => void;
  onEdit: (idx: number, key: string, value: string) => void;
  onRegenerate: () => void;
  onRefine?: (instructions: string) => void | Promise<void>;
  isRefining?: boolean;
}) {
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const canRefine = Boolean(onRefine) && refinementInstructions.trim().length > 0 && !isRefining;

  async function handleRefine() {
    if (!onRefine || !canRefine) return;
    await onRefine(refinementInstructions.trim());
    setRefinementInstructions("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {selectedCount} of {cards.length} cards selected
        </p>
        <button
          onClick={onRegenerate}
          className="text-sm text-muted hover:text-foreground"
        >
          Regenerate
        </button>
      </div>
      {onRefine && (
        <div className="space-y-2 border border-edge rounded-lg p-3">
          <label htmlFor="wizard-ai-refinement-instructions" className="block text-sm font-medium">
            Refine cards
          </label>
          <Textarea
            id="wizard-ai-refinement-instructions"
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
      <CardPreviewList cards={cards} onToggle={onToggle} onEdit={onEdit} />
    </div>
  );
}
