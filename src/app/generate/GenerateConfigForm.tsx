"use client";

import type { Methodology } from "@/lib/types";

type SrsSet = {
  _id: string;
  name: string;
};

type GenerateConfigFormProps = {
  setName: string;
  onSetNameChange: (v: string) => void;
  methodology: Methodology;
  onMethodologyChange: (v: Methodology) => void;
  selectedSetId: string;
  onSelectedSetIdChange: (v: string) => void;
  srsEnabledSets: SrsSet[];
  targetCount: number;
  onTargetCountChange: (v: number) => void;
  model: string;
  onModelChange: (v: string) => void;
  addToSrs: boolean;
  onAddToSrsChange: (v: boolean) => void;
  onGenerate: () => void;
};

export default function GenerateConfigForm({
  setName,
  onSetNameChange,
  methodology,
  onMethodologyChange,
  selectedSetId,
  onSelectedSetIdChange,
  srsEnabledSets,
  targetCount,
  onTargetCountChange,
  model,
  onModelChange,
  addToSrs,
  onAddToSrsChange,
  onGenerate,
}: GenerateConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Set Name</label>
        <input
          type="text"
          value={setName}
          onChange={(e) => onSetNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Methodology</label>
          <select
            value={methodology}
            onChange={(e) => onMethodologyChange(e.target.value as Methodology)}
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
            onChange={(e) => onSelectedSetIdChange(e.target.value)}
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
            onChange={(e) => onTargetCountChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Model (optional)</label>
          <input
            type="text"
            placeholder="Use default for provider"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={addToSrs}
          onChange={(e) => onAddToSrsChange(e.target.checked)}
        />
        Enable SRS for generated set
      </label>
      <button
        onClick={onGenerate}
        className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
      >
        Generate Cards
      </button>
    </div>
  );
}
