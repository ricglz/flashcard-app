"use client";

import { isFailureResult } from "@/lib/appResult";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LANGUAGE_PRESETS, PRESET_KEYS, type PresetKey } from "@/lib/presets";

type Props = {
  onClose: () => void;
  onCreated: (setId: string) => void;
};

export default function QuickCreateForm({ onClose, onCreated }: Props) {
  const createSet = useMutation(api.flashcardSets.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("custom");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      const preset = LANGUAGE_PRESETS[selectedPreset];
      const result = await createSet({
        name: name.trim(),
        description: description.trim() || undefined,
        fieldDefinitions: preset.fieldDefinitions,
      });
      if (isFailureResult(result)) {
        setError(result.error.message);
        setIsCreating(false);
        return;
      }
      onCreated(result.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create set");
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background border border-edge rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Quick Create Set</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., HSK 1 Vocabulary"
            className="w-full px-3 py-2 border border-edge rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description <span className="text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            className="w-full px-3 py-2 border border-edge rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Preset</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedPreset === key
                    ? "bg-accent text-white border-accent"
                    : "border-edge hover:bg-surface-hover"
                }`}
              >
                {LANGUAGE_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50 font-medium transition-colors"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
