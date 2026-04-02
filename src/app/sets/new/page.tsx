"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { LANGUAGE_PRESETS, PRESET_KEYS } from "@/lib/presets";
import { FieldDefinition } from "@/lib/types";
import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import CsvImporter from "@/components/CsvImporter";
import Link from "next/link";

export default function NewSetPage() {
  const router = useRouter();
  const createSet = useMutation(api.flashcardSets.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [presetKey, setPresetKey] = useState("chinese");
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>(
    LANGUAGE_PRESETS.chinese.fieldDefinitions
  );
  const [language, setLanguage] = useState(
    LANGUAGE_PRESETS.chinese.language
  );
  const [importedCards, setImportedCards] = useState<
    Record<string, string>[] | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    const preset = LANGUAGE_PRESETS[key];
    if (preset) {
      setFieldDefinitions(preset.fieldDefinitions);
      setLanguage(preset.language);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || fieldDefinitions.length === 0) return;

    setIsSubmitting(true);
    try {
      const setId = await createSet({
        name: name.trim(),
        description: description.trim() || undefined,
        language,
        fieldDefinitions,
      });

      if (importedCards && importedCards.length > 0) {
        await batchCreateCards({
          setId,
          cards: importedCards.map((fields, i) => ({
            fields,
            order: i,
          })),
        });
      }

      router.push(`/sets/${setId}`);
    } catch (err) {
      console.error("Failed to create set:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Flashcard Set</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., 100 Common Chinese Characters"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="What this set is for..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Language Preset
            </label>
            <select
              value={presetKey}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              {PRESET_KEYS.map((key) => (
                <option key={key} value={key}>
                  {LANGUAGE_PRESETS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Language Code
            </label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., zh-CN"
            />
          </div>

          <FieldDefinitionEditor
            value={fieldDefinitions}
            onChange={setFieldDefinitions}
          />

          <CsvImporter
            onImport={(result) => {
              setImportedCards(result.cards);
              if (
                fieldDefinitions.length === 0 ||
                presetKey === "custom"
              ) {
                setFieldDefinitions(result.fieldDefinitions);
              }
            }}
          />

          {importedCards && (
            <p className="text-sm text-green-600">
              {importedCards.length} cards ready to import
            </p>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting || !name.trim() || fieldDefinitions.length === 0
            }
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? "Creating..." : "Create Set"}
          </button>
        </form>
      </main>
    </div>
  );
}
