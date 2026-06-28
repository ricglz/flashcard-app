"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../convex/_generated/api";
import CardForm from "@/components/CardForm";
import CsvImporter from "@/components/CsvImporter";
import type { TypedSetWithViewer } from "@/hooks/convex/useTypedFlashcardSet";
import SetInfoEditor from "./SetInfoEditor";
import { PageHeader } from "@/components/ui/PageHeader";

type Flashcards = Extract<
  FunctionReturnType<typeof api.flashcards.list>,
  { ok: true }
>["value"];

export default function EditSetInner({
  setData,
  cards,
}: {
  setData: TypedSetWithViewer;
  cards: Flashcards;
}) {
  const updateSet = useMutation(api.flashcardSets.update);
  const createCard = useMutation(api.flashcards.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);
  const removeCard = useMutation(api.flashcards.remove);

  const [editingSet, setEditingSet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { set } = setData;

  const sortedFieldDefs = [...set.fieldDefinitions].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="min-h-screen">
      <PageHeader backLabel="Back to Set" />

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Edit: {set.name}</h1>
            <button
              onClick={() => setEditingSet(!editingSet)}
              className="text-sm px-3 py-1 border border-edge rounded-lg hover:bg-surface-hover transition-colors"
            >
              {editingSet ? "Done" : "Edit Set Info"}
            </button>
          </div>

          {error && <p className="text-sm text-danger mb-3">{error}</p>}

          {editingSet && (
            <SetInfoEditor
              set={set}
              fieldDefinitions={set.fieldDefinitions}
              lockFieldNames={set.cardCount > 0}
              onSave={async (updates) => {
                setError(null);
                const result = await updateSet({ id: set._id, ...updates });
                if (!result.ok) {
                  setError(result.error.message);
                  return;
                }
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

          {[...cards]
            .sort((a, b) => a.order - b.order)
            .map((card, idx) => (
              <div
                key={card._id}
                className="flex flex-wrap items-start justify-between gap-3 p-3 border rounded mb-2"
              >
                <div className="min-w-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="shrink-0 text-muted w-6">{idx + 1}</span>
                  {sortedFieldDefs.map((fd) => (
                    <span key={fd.name} className="min-w-0 break-words">
                      <span className="text-muted">{fd.name}: </span>
                      {card.fields[fd.name] ?? ""}
                    </span>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const result = await removeCard({ id: card._id });
                    if (!result.ok) setError(result.error.message);
                  }}
                  className="shrink-0 text-danger hover:text-danger-hover text-sm transition-colors"
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
            onSubmit={async (fields, tokenAnnotations) => {
              const result = await createCard({
                setId: set._id,
                fields,
                ...(Object.keys(tokenAnnotations).length > 0 ? { tokenAnnotations } : {}),
                order: cards.length,
              });
              if (!result.ok) setError(result.error.message);
            }}
          />
        </div>

        <hr />

        <CsvImporter
          onImport={async (result) => {
            if (!result.ok) return;
            const created = await batchCreateCards({
              setId: set._id,
              cards: result.cards.map((fields, i) => ({
                fields,
                order: cards.length + i,
              })),
            });
            if (!created.ok) setError(created.error.message);
          }}
        />
      </main>
    </div>
  );
}
