"use client";

import { isFailureResult } from "@/lib/appResult";
import { useState } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import CardForm from "@/components/CardForm";
import CsvImporter from "@/components/CsvImporter";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";
import SetInfoEditor from "./SetInfoEditor";

type Props = {
  setId: string;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
};

export default function EditSetClient({
  setId,
  preloadedSet,
  preloadedCards,
}: Props) {
  const { set } = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const updateSet = useMutation(api.flashcardSets.update);
  const createCard = useMutation(api.flashcards.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);
  const removeCard = useMutation(api.flashcards.remove);

  const [editingSet, setEditingSet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedFieldDefs = [...set.fieldDefinitions].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4">
        <Link
          href={`/sets/${setId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back to Set
        </Link>
      </header>

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
              onSave={async (updates) => {
                setError(null);
                const result = await updateSet({ id: set._id, ...updates });
                if (isFailureResult(result)) {
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

          {cards
            .sort((a, b) => a.order - b.order)
            .map((card, idx) => (
              <div
                key={card._id}
                className="flex items-center justify-between p-3 border rounded mb-2"
              >
                <div className="flex gap-4 text-sm">
                  <span className="text-muted w-6">{idx + 1}</span>
                  {sortedFieldDefs.map((fd) => (
                    <span key={fd.name}>
                      <span className="text-muted">{fd.name}: </span>
                      {card.fields[fd.name] ?? ""}
                    </span>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const result = await removeCard({ id: card._id });
                    if (isFailureResult(result)) setError(result.error.message);
                  }}
                  className="text-danger hover:text-danger-hover text-sm transition-colors"
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
              const result = await createCard({
                setId: set._id,
                fields,
                order: cards.length,
              });
              if (isFailureResult(result)) setError(result.error.message);
            }}
          />
        </div>

        <hr />

        <CsvImporter
          onImport={async (result) => {
            if (isFailureResult(result)) return;
            const created = await batchCreateCards({
              setId: set._id,
              cards: result.cards.map((fields, i) => ({
                fields,
                order: cards.length + i,
              })),
            });
            if (isFailureResult(created)) setError(created.error.message);
          }}
        />
      </main>
    </div>
  );
}
