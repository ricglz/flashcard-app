"use client";

import { useMemo } from "react";
import type { Methodology } from "@/lib/types";
import { METHODOLOGIES, METHODOLOGY_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import AiGenerationConfig, {
  type AiGenerationConfigValue,
} from "@/components/AiGenerationConfig";

type SrsSet = {
  _id: string;
  name: string;
};

export type GenerateConfig = {
  setName: string;
  methodology: Methodology;
  selectedSetId: string;
  targetCount: number;
  model: string;
  instructions: string;
  addToSrs: boolean;
};

export default function GenerateConfigForm({
  value,
  onChange,
  srsEnabledSets,
  onGenerate,
}: {
  value: GenerateConfig;
  onChange: (config: GenerateConfig) => void;
  srsEnabledSets: SrsSet[];
  onGenerate: (config: GenerateConfig) => void;
}) {
  const sourceSetOptions = useMemo(
    () => ["", ...srsEnabledSets.map((set) => set._id)],
    [srsEnabledSets],
  );
  const sourceSetLabels = useMemo<Record<string, string>>(
    () => ({
      "": "All SRS-enabled sets",
      ...Object.fromEntries(srsEnabledSets.map((set) => [set._id, set.name])),
    }),
    [srsEnabledSets],
  );
  const aiConfig: AiGenerationConfigValue = {
    prompt: "",
    instructions: value.instructions,
    targetCount: value.targetCount,
    model: value.model,
  };

  function update(patch: Partial<GenerateConfig>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Set Name</label>
        <input
          type="text"
          value={value.setName}
          onChange={(e) => update({ setName: e.target.value })}
          className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Methodology</label>
          <Select
            value={value.methodology}
            options={METHODOLOGIES}
            labels={METHODOLOGY_LABELS}
            onChange={(methodology) => update({ methodology })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Source Set</label>
          <Select
            value={value.selectedSetId}
            options={sourceSetOptions}
            labels={sourceSetLabels}
            onChange={(selectedSetId) => update({ selectedSetId })}
            className="w-full"
          />
        </div>
      </div>
      <AiGenerationConfig
        value={aiConfig}
        onChange={(next) =>
          update({
            instructions: next.instructions,
            targetCount: next.targetCount,
            model: next.model,
          })
        }
        showPrompt={false}
        countLabel="Target Card Count"
        instructionsPlaceholder="Add guidance for the generated remedial cards."
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.addToSrs}
          onChange={(e) => update({ addToSrs: e.target.checked })}
        />
        Enable SRS for generated set
      </label>
      <Button
        onClick={() =>
          onGenerate({
            ...value,
            instructions: value.instructions.trim(),
          })
        }
        fullWidth
        size="lg"
      >
        Generate Cards
      </Button>
    </div>
  );
}
