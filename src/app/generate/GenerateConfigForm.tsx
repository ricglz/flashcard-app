"use client";

import { useState } from "react";
import type { Methodology } from "@/lib/types";
import { useAvailableModels } from "@/lib/useAvailableModels";

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
  const [targetCount, setTargetCount] = useState(20);
  const [model, setModel] = useState("");
  const [addToSrs, setAddToSrs] = useState(true);
  const { models: availableModels } = useAvailableModels();

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
          <select
            value={methodology}
            onChange={(e) => setMethodology(e.target.value as Methodology)}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          >
            <option value="balanced">Balanced</option>
            <option value="recent_lapses">Recent Lapses</option>
            <option value="low_ease">Low Ease</option>
            <option value="learning_stuck">Learning Stuck</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Source Set</label>
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          >
            <option value="">All SRS-enabled sets</option>
            {srsEnabledSets.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Target Card Count</label>
          <input
            type="number"
            min={1}
            max={100}
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          >
            <option value="">Default for provider</option>
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={addToSrs}
          onChange={(e) => setAddToSrs(e.target.checked)}
        />
        Enable SRS for generated set
      </label>
      <button
        onClick={() => onGenerate({ setName, methodology, selectedSetId, targetCount, model, addToSrs })}
        className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
      >
        Generate Cards
      </button>
    </div>
  );
}
