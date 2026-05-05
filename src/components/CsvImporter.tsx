"use client";

import { useState, useRef, useCallback } from "react";
import { parseCsv, ParsedCsvResult } from "@/lib/csvParser";

type Props = {
  onImport: (result: ParsedCsvResult) => void;
};

export default function CsvImporter({
  onImport,
}: Props) {
  const [preview, setPreview] = useState<ParsedCsvResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
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
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      processFile(file);
    } else {
      setError("Please drop a .csv file.");
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-accent bg-accent-surface"
            : "border-edge hover:border-muted"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
        />
        <p className="text-sm text-muted">
          Drop a CSV file here or click to browse
        </p>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      {preview && (
        <div className="border rounded p-4 space-y-3">
          <h4 className="font-medium">Preview</h4>
          <p className="text-sm text-muted">
            {preview.cards.length} cards with{" "}
            {preview.fieldDefinitions.length} fields
          </p>

          {preview.errors.length > 0 && (
            <div className="text-sm text-warning bg-warning-surface p-2 rounded-lg">
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
                      className="border px-2 py-1 text-left bg-raised"
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
                      className="border px-2 py-1 text-muted text-center"
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
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
            >
              Import {preview.cards.length} Cards
            </button>
            <button
              onClick={() => {
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
