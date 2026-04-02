"use client";

import { useState, useRef } from "react";
import { parseCsv, ParsedCsvResult } from "@/lib/csvParser";
import { FieldDefinition } from "@/lib/types";

type Props = {
  onImport: (result: ParsedCsvResult) => void;
  existingFieldDefinitions?: FieldDefinition[];
};

export default function CsvImporter({
  onImport,
  existingFieldDefinitions,
}: Props) {
  const [preview, setPreview] = useState<ParsedCsvResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCsv(text);
      if (result.cards.length === 0) {
        setError("No valid rows found in the CSV.");
        return;
      }
      setPreview(result);
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Import from CSV
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {preview && (
        <div className="border rounded p-4 space-y-3">
          <h4 className="font-medium">Preview</h4>
          <p className="text-sm text-gray-600">
            {preview.cards.length} cards with{" "}
            {preview.fieldDefinitions.length} fields
          </p>

          {preview.errors.length > 0 && (
            <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
              <p className="font-medium">Warnings:</p>
              {preview.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr>
                  {preview.fieldDefinitions.map((fd) => (
                    <th
                      key={fd.name}
                      className="border px-2 py-1 text-left bg-gray-50"
                    >
                      {fd.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.cards.slice(0, 5).map((card, i) => (
                  <tr key={i}>
                    {preview.fieldDefinitions.map((fd) => (
                      <td key={fd.name} className="border px-2 py-1">
                        {card[fd.name] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
                {preview.cards.length > 5 && (
                  <tr>
                    <td
                      colSpan={preview.fieldDefinitions.length}
                      className="border px-2 py-1 text-gray-400 text-center"
                    >
                      ...and {preview.cards.length - 5} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Import {preview.cards.length} Cards
            </button>
            <button
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
