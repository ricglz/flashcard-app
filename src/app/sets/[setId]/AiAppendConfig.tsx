"use client";

import { AiInstructionsField } from "@/components/ai-generation/AiInstructionsField";
import { AiModelField } from "@/components/ai-generation/AiModelField";
import { AiPromptField } from "@/components/ai-generation/AiPromptField";
import { AiTargetCountField } from "@/components/ai-generation/AiTargetCountField";

export type AiAppendConfigValue = {
  prompt: string;
  instructions: string;
  targetCount: number;
  model: string;
};

type Props = {
  value: AiAppendConfigValue;
  onChange: (config: AiAppendConfigValue) => void;
  onGenerate: (config: AiAppendConfigValue) => void;
};

export default function AiAppendConfig({ value, onChange, onGenerate }: Props) {
  return (
    <div className="space-y-3">
      <AiPromptField
        value={value.prompt}
        onChange={(prompt) => onChange({ ...value, prompt })}
      />
      <AiInstructionsField
        value={value.instructions}
        onChange={(instructions) => onChange({ ...value, instructions })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AiTargetCountField
          value={value.targetCount}
          onChange={(targetCount) => onChange({ ...value, targetCount })}
        />
        <AiModelField
          value={value.model}
          onChange={(model) => onChange({ ...value, model })}
        />
      </div>
      <button
        onClick={() =>
          onGenerate({
            prompt: value.prompt.trim(),
            instructions: value.instructions.trim(),
            targetCount: value.targetCount,
            model: value.model,
          })
        }
        disabled={!value.prompt.trim()}
        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50"
      >
        Generate
      </button>
    </div>
  );
}
