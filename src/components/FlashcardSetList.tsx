"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import Link from "next/link";

export default function FlashcardSetList() {
  const sets = useOfflineQuery(api.flashcardSets.list);
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
        {sets.map((set) => {
          const isOwner = set.userSet.role === "owner";
          return (
            <div
              key={set._id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
            >
              <Link href={`/sets/${set._id}`} className="block flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{set.name}</h3>
                  {set.origin?.kind === "ai_generated" && (
                    <span className="px-1.5 py-0.5 bg-info-surface border border-info-edge rounded text-xs text-muted">
                      AI generated
                    </span>
                  )}
                  {set.origin?.kind === "forked" && (
                    <span className="px-1.5 py-0.5 bg-info-surface border border-info-edge rounded text-xs text-muted">
                      Forked
                    </span>
                  )}
                </div>
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
                  {!isOwner && (
                    <span className="px-1.5 py-0.5 bg-surface-hover rounded text-xs">
                      Shared
                    </span>
                  )}
                </div>
              </Link>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/study/${set._id}`}
                  className="text-sm px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Study
                </Link>
                {isOwner && (
                  <>
                    <Link
                      href={`/sets/${set._id}/edit`}
                      className="text-sm px-3 py-1.5 border border-edge text-foreground rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Delete this set and all its cards?")) {
                          void removeSet({ id: set._id });
                        }
                      }}
                      className="text-sm px-3 py-1.5 text-muted rounded-lg hover:text-danger hover:bg-danger-surface transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
