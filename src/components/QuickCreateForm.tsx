"use client";


import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useSaveHandler } from "@/hooks/useSaveHandler";
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
  const { execute, isSaving, error } = useSaveHandler<string>({
    fallbackErrorMessage: "Failed to create set",
    onSuccess: onCreated,
  });

  const handleCreate = async () => {
    if (!name.trim() || isSaving) return;
    const preset = LANGUAGE_PRESETS[selectedPreset];
    await execute(() =>
      createSet({
        name: name.trim(),
        description: description.trim() || undefined,
        fieldDefinitions: preset.fieldDefinitions,
      })
    );
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
              <Button
                key={key}
                onClick={() => setSelectedPreset(key)}
                variant={selectedPreset === key ? "primary" : "secondary"}
                size="sm"
              >
                {LANGUAGE_PRESETS[key].label}
              </Button>
            ))}
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={onClose}
            variant="secondary"
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isSaving}
            loading={isSaving}
            fullWidth
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
