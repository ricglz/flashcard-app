"use client";

import { useState } from "react";
import AiGenerationConfig, {
  type AiGenerationConfigValue,
} from "@/components/AiGenerationConfig";

type Props = {
  onGenerate: (config: {
    prompt: string;
    instructions: string;
    targetCount: number;
    model: string;
  }) => void;
};

export default function AiAppendConfig({ onGenerate }: Props) {
  const [config, setConfig] = useState<AiGenerationConfigValue>({
    prompt: "",
    instructions: "",
    targetCount: 10,
    model: "",
  });

  return (
    <div className="space-y-3">
      <AiGenerationConfig
        value={config}
        onChange={setConfig}
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
