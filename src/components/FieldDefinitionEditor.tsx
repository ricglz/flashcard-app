"use client";

import { useState } from "react";
import { FieldDefinition, FIELD_ROLES, FIELD_ROLE_LABELS } from "@/lib/types";

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
    if (!newFieldName.trim()) return;
    const field: FieldDefinition = {
      name: newFieldName.trim(),
      role: "primary",
      metadata: {},
      order: value.length,
    };
    onChange([...value, field]);
    setNewFieldName("");
  };

  const updateField = (
    index: number,
    updates: Partial<FieldDefinition>
  ) => {
    const updated = value.map((f, i) =>
      i === index ? { ...f, ...updates } : f
    );
    onChange(updated);
  };

  const removeField = (index: number) => {
    const updated = value
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, order: i }));
    onChange(updated);
  };

  const toggleTts = (index: number, lang: string) => {
    const field = value[index];
    const hasTts = !!field.metadata.tts;
    updateField(index, {
      metadata: hasTts ? {} : { ...field.metadata, tts: { lang } },
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Field Definitions</label>
      {value.map((field, index) => (
        <div
          key={index}
          className="flex items-center gap-2 p-2 border rounded"
        >
          {readOnlyNames ? (
            <span className="flex-1 px-2 py-1 text-sm font-medium">
              {field.name}
            </span>
          ) : (
            <input
              type="text"
              value={field.name}
              onChange={(e) => updateField(index, { name: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-sm"
              placeholder="Field name"
            />
          )}
          <select
            value={field.role}
            onChange={(e) =>
              updateField(index, {
                role: e.target.value as FieldDefinition["role"],
              })
            }
            className="px-2 py-1 border rounded text-sm"
          >
            {FIELD_ROLES.map((role) => (
              <option key={role} value={role}>
                {FIELD_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={!!field.metadata.tts}
              onChange={() => toggleTts(index, "en")}
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
              className="w-16 px-2 py-1 border rounded text-xs"
              placeholder="lang"
            />
          )}
          {allowAddRemove && (
            <button
              onClick={() => removeField(index)}
              className="text-danger hover:text-danger-hover text-sm px-1 transition-colors"
            >
              X
            </button>
          )}
        </div>
      ))}
      {allowAddRemove && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addField()}
            className="flex-1 px-3 py-2 border rounded text-sm"
            placeholder="New field name..."
          />
          <button
            onClick={addField}
            className="px-3 py-2 bg-raised border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Add Field
          </button>
        </div>
      )}
    </div>
  );
}
