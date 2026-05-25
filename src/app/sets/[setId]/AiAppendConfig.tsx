"use client";

import AiGenerationConfig, {
  type AiGenerationConfigValue,
} from "@/components/AiGenerationConfig";

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
  const config: AiGenerationConfigValue = value;

  return (
    <div className="space-y-3">
      <AiGenerationConfig
        value={config}
        onChange={onChange}
        maxCount={50}
        modelLabel="Model (optional)"
        modelDefaultLabel="Default"
      />
      <button
        onClick={() =>
          onGenerate({
            prompt: config.prompt.trim(),
            instructions: config.instructions.trim(),
            targetCount: config.targetCount,
            model: config.model,
          })
        }
        disabled={!config.prompt.trim()}
        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50"
      >
        Generate
      </button>
    </div>
  );
}
