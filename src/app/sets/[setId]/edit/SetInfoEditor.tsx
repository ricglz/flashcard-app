"use client";

import { useState } from "react";
import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import { FieldDefinition } from "@/lib/types";

export default function SetInfoEditor({
  set,
  fieldDefinitions,
  onSave,
}: {
  set: { name: string; description?: string };
  fieldDefinitions: FieldDefinition[];
  onSave: (updates: {
    name?: string;
    description?: string;
    fieldDefinitions?: FieldDefinition[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState(set.name);
  const [description, setDescription] = useState(set.description ?? "");
  const [fds, setFds] = useState(fieldDefinitions);

  return (
    <div className="space-y-4 p-4 border rounded">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          rows={2}
        />
      </div>
      <FieldDefinitionEditor value={fds} onChange={setFds} />
      <button
        onClick={() =>
          onSave({
            name,
            description: description || undefined,
            fieldDefinitions: fds,
          })
        }
        className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
      >
        Save Changes
      </button>
    </div>
  );
}
