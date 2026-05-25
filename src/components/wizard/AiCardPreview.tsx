"use client";

import CardPreviewList, { type PreviewCard } from "@/components/CardPreviewList";
import AiRefinementPanel from "@/components/AiRefinementPanel";
import type { RefinementRequest, RefinementResult } from "@/lib/refinementScope";

export default function AiCardPreview({
  cards,
  selectedCount,
  onToggle,
  onEdit,
  onRegenerate,
  onRefine,
  refinementModel,
  onRefinementModelChange,
  locked,
}: {
  cards: PreviewCard[];
  selectedCount: number;
  onToggle: (idx: number) => void;
  onEdit: (idx: number, key: string, value: string) => void;
  onRegenerate: () => void;
  onRefine?: (request: RefinementRequest) => RefinementResult | Promise<RefinementResult>;
  refinementModel: string;
  onRefinementModelChange: (model: string) => void;
  locked: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {selectedCount} of {cards.length} cards included
        </p>
        <button
          onClick={onRegenerate}
          disabled={locked}
          className="text-sm text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Regenerate
        </button>
      </div>
      {onRefine && (
        <AiRefinementPanel
          cards={cards}
          refinementModel={refinementModel}
          onRefinementModelChange={onRefinementModelChange}
          onRefine={onRefine}
          pending={locked}
          disabled={locked}
        />
      )}
      <CardPreviewList
        cards={cards}
        onToggle={onToggle}
        onEdit={onEdit}
        disabled={locked}
      />
    </div>
  );
}
