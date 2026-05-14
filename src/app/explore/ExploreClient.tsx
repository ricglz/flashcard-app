"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExploreClient() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.flashcardSets.listPublic,
    {},
    { initialNumItems: 12 }
  );
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-bold">Explore Sets</h1>
        <div className="w-14" />
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {status === "LoadingFirstPage" && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        )}

        {results.length === 0 && status === "Exhausted" && (
          <div className="text-center py-12">
            <p className="text-muted mb-4">
              No public sets available yet. Be the first to share one!
            </p>
            <Link
              href="/sets"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Go to My Sets
            </Link>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((set) => (
              <Link
                key={set._id}
                href={`/sets/${set._id}`}
                className="border border-edge rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
              >
                <h3 className="font-semibold text-lg mb-1">{set.name}</h3>
                {set.description && (
                  <p className="text-muted text-sm mb-2 line-clamp-2">
                    {set.description}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-3 text-xs text-muted pt-2">
                  <span>
                    {set.fieldDefinitions.length} field
                    {set.fieldDefinitions.length !== 1 ? "s" : ""}
                  </span>
                  <span>
                    {set.cardCount ?? "?"} card
                    {(set.cardCount ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {status === "CanLoadMore" && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => loadMore(12)}
              className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        {status === "LoadingMore" && (
          <div className="flex justify-center mt-6">
            <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        )}
      </main>
    </div>
  );
}
