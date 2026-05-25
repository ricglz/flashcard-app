"use client";


import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FieldDefinition } from "@/lib/types";
import { getDisplayableFields } from "@/lib/types";
import { useFieldAssignment } from "@/hooks/useFieldAssignment";

type Props = {
  setId: Id<"flashcardSets">;
  srsEnabled: boolean;
  defaultFrontFields: string[];
  defaultBackFields: string[];
  defaultTtsOnlyFields: string[];
  fieldDefinitions: FieldDefinition[];
};

export default function SrsSetConfig({
  setId,
  srsEnabled,
  defaultFrontFields,
  defaultBackFields,
  defaultTtsOnlyFields,
  fieldDefinitions,
}: Props) {
  const updateUserSet = useMutation(api.userSets.update);
  const [isSaving, setIsSaving] = useState(false);
  const [localSrsEnabled, setLocalSrsEnabled] = useState(srsEnabled);
  const [error, setError] = useState<string | null>(null);
  const { assignment, toggleField } = useFieldAssignment({
    initial: {
      frontFields: defaultFrontFields,
      backFields: defaultBackFields,
      ttsOnlyFields: defaultTtsOnlyFields,
    },
    fieldDefinitions,
  });
  const {
    frontFields: localFront,
    backFields: localBack,
    ttsOnlyFields: localTtsOnly,
  } = assignment;

  const sortedFields = getDisplayableFields(fieldDefinitions);
  const allFieldNames = sortedFields.map((fd) => fd.name);

  const hasChanges =
    localSrsEnabled !== srsEnabled ||
    JSON.stringify(localFront) !== JSON.stringify(defaultFrontFields) ||
    JSON.stringify(localBack) !== JSON.stringify(defaultBackFields) ||
    JSON.stringify(localTtsOnly) !== JSON.stringify(defaultTtsOnlyFields);

  async function handleSave() {
    setIsSaving(true);
    try {
      setError(null);
      const result = await updateUserSet({
        setId,
        srsEnabled: localSrsEnabled,
        defaultFrontFields: localFront,
        defaultBackFields: localBack,
        defaultTtsOnlyFields: localTtsOnly,
      });
      if (!result.ok) setError(result.error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">SRS Settings</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-muted">
            {localSrsEnabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={() => setLocalSrsEnabled((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              localSrsEnabled ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                localSrsEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </label>
      </div>

      {localSrsEnabled && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Default study direction for SRS reviews:
          </p>
          <div className="flex flex-wrap gap-2">
            {allFieldNames.map((name) => {
              const isFront = localFront.includes(name);
              const isTtsOnly = localTtsOnly.includes(name);
              const label = isFront ? "Front" : isTtsOnly ? "TTS Only" : "Back";
              const style = isFront
                ? "bg-accent/10 border-accent text-accent"
                : isTtsOnly
                  ? "bg-info-surface border-info-edge text-muted"
                  : "border-edge text-muted hover:border-accent/50";
              return (
                <button
                  key={name}
                  onClick={() => toggleField(name)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${style}`}
                >
                  {name}: {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save SRS Settings"}
        </button>
      )}
    </div>
  );
}
