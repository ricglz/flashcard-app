"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import CardForm from "@/components/CardForm";
import CsvImporter from "@/components/CsvImporter";
import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import { FieldDefinition } from "@/lib/types";

export default function EditSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const set = useQuery(api.flashcardSets.get, {
    id: setId as Id<"flashcardSets">,
  });
  const cards = useQuery(api.flashcards.list, {
    setId: setId as Id<"flashcardSets">,
  });
  const updateSet = useMutation(api.flashcardSets.update);
  const createCard = useMutation(api.flashcards.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);
  const removeCard = useMutation(api.flashcards.remove);

  const [editingSet, setEditingSet] = useState(false);

  if (set === undefined || cards === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (set === null) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Set not found.</p>
      </div>
    );
  }

  const typedFieldDefs = set.fieldDefinitions as FieldDefinition[];
  const sortedFieldDefs = [...typedFieldDefs].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <Link
          href={`/sets/${setId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Set
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Edit: {set.name}</h1>
            <button
              onClick={() => setEditingSet(!editingSet)}
              className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
            >
              {editingSet ? "Done" : "Edit Set Info"}
            </button>
          </div>

          {editingSet && (
            <SetInfoEditor
              set={set}
              fieldDefinitions={typedFieldDefs}
              onSave={async (updates) => {
                await updateSet({ id: set._id, ...updates });
                setEditingSet(false);
              }}
            />
          )}
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold mb-4">
            Cards ({cards.length})
          </h2>

          {cards
            .sort((a, b) => a.order - b.order)
            .map((card, idx) => (
              <div
                key={card._id}
                className="flex items-center justify-between p-3 border rounded mb-2"
              >
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-400 w-6">{idx + 1}</span>
                  {sortedFieldDefs.map((fd) => (
                    <span key={fd.name}>
                      <span className="text-gray-400">{fd.name}: </span>
                      {card.fields[fd.name] ?? ""}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => removeCard({ id: card._id })}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold mb-4">Add Card</h2>
          <CardForm
            fieldDefinitions={sortedFieldDefs}
            onSubmit={async (fields) => {
              await createCard({
                setId: set._id,
                fields,
                order: cards.length,
              });
            }}
          />
        </div>

        <hr />

        <CsvImporter
          onImport={async (result) => {
            await batchCreateCards({
              setId: set._id,
              cards: result.cards.map((fields, i) => ({
                fields,
                order: cards.length + i,
              })),
            });
          }}
          existingFieldDefinitions={typedFieldDefs}
        />
      </main>
    </div>
  );
}

function SetInfoEditor({
  set,
  fieldDefinitions,
  onSave,
}: {
  set: { name: string; description?: string; language: string };
  fieldDefinitions: FieldDefinition[];
  onSave: (updates: {
    name?: string;
    description?: string;
    language?: string;
    fieldDefinitions?: FieldDefinition[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState(set.name);
  const [description, setDescription] = useState(set.description ?? "");
  const [language, setLanguage] = useState(set.language);
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
      <div>
        <label className="block text-sm font-medium mb-1">Language</label>
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <FieldDefinitionEditor value={fds} onChange={setFds} />
      <button
        onClick={() =>
          onSave({
            name,
            description: description || undefined,
            language,
            fieldDefinitions: fds,
          })
        }
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      >
        Save Changes
      </button>
    </div>
  );
}
