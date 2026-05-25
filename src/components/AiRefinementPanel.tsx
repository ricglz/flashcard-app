"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAvailableModels } from "@/hooks/useAvailableModels";
import {
  getRefinementScopeCount,
  type RefinementRequest,
  type RefinementResult,
  type RefinementScope,
} from "@/lib/refinementScope";

type SelectableCard = {
  selected: boolean;
};

const REFINEMENT_SCOPES: readonly RefinementScope[] = ["all", "included", "excluded"];

export default function AiRefinementPanel({
  cards,
  refinementModel,
  onRefinementModelChange,
  onRefine,
  pending = false,
  disabled = false,
}: {
  cards: readonly SelectableCard[];
  refinementModel: string;
  onRefinementModelChange: (model: string) => void;
  onRefine: (request: RefinementRequest) => RefinementResult | Promise<RefinementResult>;
  pending?: boolean;
  disabled?: boolean;
}) {
  const [instructions, setInstructions] = useState("");
  const [scope, setScope] = useState<RefinementScope>("all");
  const { models: availableModels } = useAvailableModels();
  const trimmedInstructions = instructions.trim();
  const scopeCount = getRefinementScopeCount(cards, scope);

  const modelOptions = useMemo(
    () => {
      const availableOptions = availableModels.map((model) => model.id);
      return refinementModel && !availableOptions.includes(refinementModel)
        ? ["", refinementModel, ...availableOptions]
        : ["", ...availableOptions];
    },
    [availableModels, refinementModel],
  );

  const modelLabels = useMemo<Record<string, string>>(
    () => ({
      "": "Default for provider",
      ...(refinementModel ? { [refinementModel]: refinementModel } : {}),
      ...Object.fromEntries(
        availableModels.map((model) => [model.id, model.name]),
      ),
    }),
    [availableModels, refinementModel],
  );

  const scopeLabels = useMemo<Record<RefinementScope, string>>(
    () => ({
      all: `All cards (${getRefinementScopeCount(cards, "all")})`,
      included: `Included cards (${getRefinementScopeCount(cards, "included")})`,
      excluded: `Excluded cards (${getRefinementScopeCount(cards, "excluded")})`,
    }),
    [cards],
  );

  const canRefine = trimmedInstructions.length > 0 && scopeCount > 0 && !pending && !disabled;

  async function handleRefine() {
    if (!canRefine) return;
    const result = await onRefine({
      instructions: trimmedInstructions,
      model: refinementModel,
      scope,
    });
    if (result.kind === "applied") setInstructions("");
  }

  return (
    <div className="space-y-3 border border-edge rounded-lg p-3">
      <div>
        <label htmlFor="ai-refinement-instructions" className="block text-sm font-medium mb-1">
          Refine cards
        </label>
        <Textarea
          id="ai-refinement-instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={2}
          placeholder="Tell the AI what to improve in this draft."
          disabled={pending || disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="ai-refinement-scope" className="block text-sm font-medium mb-1">
            Revise
          </label>
          <Select
            id="ai-refinement-scope"
            value={scope}
            options={REFINEMENT_SCOPES}
            labels={scopeLabels}
            onChange={setScope}
            disabled={pending || disabled}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="ai-refinement-model" className="block text-sm font-medium mb-1">
            Revision model
          </label>
          <Select
            id="ai-refinement-model"
            value={refinementModel}
            options={modelOptions}
            labels={modelLabels}
            onChange={onRefinementModelChange}
            disabled={pending || disabled}
            className="w-full"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void handleRefine()}
        disabled={!canRefine}
        loading={pending}
      >
        Refine Draft
      </Button>
    </div>
  );
}
