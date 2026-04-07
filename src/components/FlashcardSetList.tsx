"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function FlashcardSetList() {
  const sets = useQuery(api.flashcardSets.list);
  const removeSet = useMutation(api.flashcardSets.remove);

  if (sets === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted mb-4">No flashcard sets yet.</p>
        <Link
          href="/sets/new"
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          Create Your First Set
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Flashcard Sets</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <div
            key={set._id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <Link href={`/sets/${set._id}`} className="block">
              <h3 className="font-semibold text-lg mb-1">{set.name}</h3>
              {set.description && (
                <p className="text-muted text-sm mb-2">
                  {set.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>
                  {set.fieldDefinitions.length} field
                  {set.fieldDefinitions.length !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/study/${set._id}`}
                className="text-sm px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Study
              </Link>
              <Link
                href={`/sets/${set._id}/edit`}
                className="text-sm px-3 py-1.5 border border-edge text-foreground rounded-lg hover:bg-surface-hover transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm("Delete this set and all its cards?")) {
                    removeSet({ id: set._id });
                  }
                }}
                className="text-sm px-3 py-1.5 text-muted rounded-lg hover:text-danger hover:bg-danger-surface transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
