"use client";

import { useMemo, useState } from "react";
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
  initialMethodology,
  initialSetId,
  srsEnabledSets,
  onGenerate,
}: {
  initialMethodology: Methodology;
  initialSetId: string;
  srsEnabledSets: SrsSet[];
  onGenerate: (config: GenerateConfig) => void;
}) {
  const [setName, setSetName] = useState("Remedial Cards");
  const [methodology, setMethodology] = useState<Methodology>(initialMethodology);
  const [selectedSetId, setSelectedSetId] = useState(initialSetId);
  const [aiConfig, setAiConfig] = useState<AiGenerationConfigValue>({
    prompt: "",
    instructions: "",
    targetCount: 20,
    model: "",
  });
  const [addToSrs, setAddToSrs] = useState(true);
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Set Name</label>
        <input
          type="text"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Methodology</label>
          <Select
            value={methodology}
            options={METHODOLOGIES}
            labels={METHODOLOGY_LABELS}
            onChange={setMethodology}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Source Set</label>
          <Select
            value={selectedSetId}
            options={sourceSetOptions}
            labels={sourceSetLabels}
            onChange={setSelectedSetId}
            className="w-full"
          />
        </div>
      </div>
      <AiGenerationConfig
        value={aiConfig}
        onChange={setAiConfig}
        showPrompt={false}
        countLabel="Target Card Count"
        instructionsPlaceholder="Add guidance for the generated remedial cards."
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={addToSrs}
          onChange={(e) => setAddToSrs(e.target.checked)}
        />
        Enable SRS for generated set
      </label>
      <Button
        onClick={() =>
          onGenerate({
            setName,
            methodology,
            selectedSetId,
            targetCount: aiConfig.targetCount,
            model: aiConfig.model,
            instructions: aiConfig.instructions.trim(),
            addToSrs,
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
