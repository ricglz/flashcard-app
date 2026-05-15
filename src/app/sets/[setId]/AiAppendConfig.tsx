"use client";

import { useState } from "react";

type Props = {
  onGenerate: (config: {
    prompt: string;
    instructions: string;
    targetCount: number;
    model: string;
  }) => void;
};

export default function AiAppendConfig({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [targetCount, setTargetCount] = useState(10);
  const [model, setModel] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="ai-prompt" className="block text-sm font-medium mb-1">
          Prompt
        </label>
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe the cards you want to generate..."
          className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
        />
      </div>
      <div>
        <label htmlFor="ai-instructions" className="block text-sm font-medium mb-1">
          Additional instructions (optional)
        </label>
        <textarea
          id="ai-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder="Any specific guidelines for card format, difficulty, etc."
          className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
        />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <label htmlFor="ai-count" className="block text-sm font-medium mb-1">
            Target count
          </label>
          <input
            id="ai-count"
            type="number"
            min={1}
            max={50}
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value) || 10)}
            className="w-24 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          />
        </div>
        <div>
          <label htmlFor="ai-model" className="block text-sm font-medium mb-1">
            Model (optional)
          </label>
          <input
            id="ai-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Default"
            className="w-40 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          />
        </div>
      </div>
      <button
        onClick={() => onGenerate({ prompt: prompt.trim(), instructions: instructions.trim(), targetCount, model })}
        disabled={!prompt.trim()}
        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50"
      >
        Generate
      </button>
    </div>
  );
}
