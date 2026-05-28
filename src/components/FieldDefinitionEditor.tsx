"use client";

import { useState } from "react";
import type { FieldDefinition, FieldRole } from "@/lib/types";
import { FIELD_ROLES, FIELD_ROLE_LABELS } from "@/lib/types";
import { Select } from "@/components/ui/Select";
import {
  addFieldDefinition,
  removeFieldDefinition,
  toggleFieldDefinitionTts,
  updateFieldDefinition,
} from "@/lib/fieldDefinitionsDraft";

type Props = {
  value: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  readOnlyNames?: boolean;
  allowAddRemove?: boolean;
};

export default function FieldDefinitionEditor({
  value,
  onChange,
  readOnlyNames = false,
  allowAddRemove = true,
}: Props) {
  const [newFieldName, setNewFieldName] = useState("");

  const addField = () => {
    const updated = addFieldDefinition(value, newFieldName);
    if (updated.length === value.length) return;
    onChange(updated);
    setNewFieldName("");
  };

  const updateField = (
    index: number,
    updates: Partial<FieldDefinition>
  ) => {
    onChange(updateFieldDefinition(value, index, updates));
  };

  const removeField = (index: number) => {
    onChange(removeFieldDefinition(value, index));
  };

  const toggleTts = (index: number) => {
    onChange(toggleFieldDefinitionTts(value, index));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Field Definitions</label>
      {value.map((field, index) => (
        <div
          key={index}
          className="grid gap-2 p-2 border rounded sm:grid-cols-[minmax(0,1fr)_minmax(8rem,10rem)_auto_auto_auto] sm:items-center"
        >
          {readOnlyNames ? (
            <span className="min-w-0 w-full px-2 py-1 text-sm font-medium break-words">
              {field.name}
            </span>
          ) : (
            <input
              type="text"
              value={field.name}
              onChange={(e) => updateField(index, { name: e.target.value })}
              className="min-w-0 w-full px-2 py-1 border rounded text-sm"
              placeholder="Field name"
            />
          )}
          <Select
            value={field.role}
            options={FIELD_ROLES}
            labels={FIELD_ROLE_LABELS}
            onChange={(role: FieldRole) => updateField(index, { role })}
            className="w-full min-w-0 px-2 py-1"
          />
          <label className="flex items-center gap-1 text-xs sm:justify-self-center">
            <input
              type="checkbox"
              checked={!!field.metadata.tts}
              onChange={() => toggleTts(index)}
            />
            TTS
          </label>
          {field.metadata.tts && (
            <input
              type="text"
              value={field.metadata.tts.lang}
              onChange={(e) =>
                updateField(index, {
                  metadata: {
                    ...field.metadata,
                    tts: { lang: e.target.value },
                  },
                })
              }
              className="w-full sm:w-16 px-2 py-1 border rounded text-xs"
              placeholder="lang"
            />
          )}
          {allowAddRemove && (
            <button
              onClick={() => removeField(index)}
              className="justify-self-start sm:justify-self-end text-danger hover:text-danger-hover text-sm px-1 transition-colors"
            >
              X
            </button>
          )}
        </div>
      ))}
      {allowAddRemove && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addField()}
            className="min-w-0 w-full px-3 py-2 border rounded text-sm"
            placeholder="New field name..."
          />
          <button
            onClick={addField}
            className="w-full sm:w-auto px-3 py-2 bg-raised border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Add Field
          </button>
        </div>
      )}
    </div>
  );
}
