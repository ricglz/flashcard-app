"use client";

import { useState } from "react";
import type { FieldDefinition } from "@/lib/types";

type Props = {
  fieldDefinitions: FieldDefinition[];
  initialFields?: Record<string, string>;
  onSubmit: (fields: Record<string, string>) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export default function CardForm({
  fieldDefinitions,
  initialFields,
  onSubmit,
  onCancel,
  submitLabel = "Add Card",
}: Props) {
  const [fields, setFields] = useState<Record<string, string>>(
    initialFields ??
      Object.fromEntries(fieldDefinitions.map((f) => [f.name, ""]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(fields);
    if (!initialFields) {
      setFields(
        Object.fromEntries(fieldDefinitions.map((f) => [f.name, ""]))
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fieldDefinitions
        .sort((a, b) => a.order - b.order)
        .map((fd) => (
          <div key={fd.name}>
            <label className="block text-sm font-medium mb-1">
              {fd.name}
            </label>
            <input
              type="text"
              value={fields[fd.name] ?? ""}
              onChange={(e) =>
                setFields((prev) => ({
                  ...prev,
                  [fd.name]: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border rounded text-sm"
              placeholder={`Enter ${fd.name.toLowerCase()}...`}
            />
          </div>
        ))}
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
