"use client";

import { useMemo } from "react";
import { useAvailableModels } from "@/hooks/useAvailableModels";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export type AiGenerationConfigValue = {
  prompt: string;
  instructions: string;
  targetCount: number;
  model: string;
};

export default function AiGenerationConfig({
  value,
  onChange,
  showPrompt = true,
  promptLabel = "Prompt",
  promptPlaceholder = "Describe the cards you want to generate...",
  instructionsLabel = "Additional Instructions (optional)",
  instructionsPlaceholder = "Any specific guidelines for card format, difficulty, etc.",
  countLabel = "Target count",
  minCount = 1,
  maxCount = 100,
  modelLabel = "Model",
  modelDefaultLabel = "Default for provider",
  disabled = false,
}: {
  value: AiGenerationConfigValue;
  onChange: (value: AiGenerationConfigValue) => void;
  showPrompt?: boolean;
  promptLabel?: string;
  promptPlaceholder?: string;
  instructionsLabel?: string;
  instructionsPlaceholder?: string;
  countLabel?: string;
  minCount?: number;
  maxCount?: number;
  modelLabel?: string;
  modelDefaultLabel?: string;
  disabled?: boolean;
}) {
  const { models: availableModels } = useAvailableModels();
  const modelOptions = useMemo(
    () => ["", ...availableModels.map((model) => model.id)],
    [availableModels],
  );
  const modelLabels = useMemo<Record<string, string>>(
    () => ({
      "": modelDefaultLabel,
      ...Object.fromEntries(
        availableModels.map((model) => [model.id, model.name]),
      ),
    }),
    [availableModels, modelDefaultLabel],
  );

  function update(patch: Partial<AiGenerationConfigValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-3">
      {showPrompt && (
        <div>
          <label htmlFor="ai-generation-prompt" className="block text-sm font-medium mb-1">
            {promptLabel}
          </label>
          <Textarea
            id="ai-generation-prompt"
            value={value.prompt}
            onChange={(event) => update({ prompt: event.target.value })}
            rows={3}
            placeholder={promptPlaceholder}
            disabled={disabled}
          />
        </div>
      )}

      <div>
        <label htmlFor="ai-generation-instructions" className="block text-sm font-medium mb-1">
          {instructionsLabel}
        </label>
        <Textarea
          id="ai-generation-instructions"
          value={value.instructions}
          onChange={(event) => update({ instructions: event.target.value })}
          rows={2}
          placeholder={instructionsPlaceholder}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ai-generation-count" className="block text-sm font-medium mb-1">
            {countLabel}
          </label>
          <input
            id="ai-generation-count"
            type="number"
            min={minCount}
            max={maxCount}
            value={value.targetCount}
            onChange={(event) =>
              update({ targetCount: Number(event.target.value) || minCount })
            }
            disabled={disabled}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="ai-generation-model" className="block text-sm font-medium mb-1">
            {modelLabel}
          </label>
          <Select
            id="ai-generation-model"
            value={value.model}
            options={modelOptions}
            labels={modelLabels}
            onChange={(model) => update({ model })}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
