"use client";

import { useState, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { SetCard } from "./SetCard";

type SortOption = "newest" | "name" | "cards";

export default function ExploreClient() {
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const debouncedSearch = useDebounce(searchInput, 300);
  const isSearching = debouncedSearch.length > 0;

  const { results: browseResults, status, loadMore } = usePaginatedQuery(
    api.flashcardSets.listPublic,
    isSearching ? "skip" : {},
    { initialNumItems: 12 }
  );

  const searchResults = useQuery(
    api.flashcardSets.searchPublic,
    isSearching ? { searchTerm: debouncedSearch } : "skip"
  );

  const router = useRouter();

  const displayResults = useMemo(() => {
    if (isSearching) return searchResults ?? [];
    const sorted = [...browseResults];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "cards":
        sorted.sort((a, b) => b.cardCount - a.cardCount);
        break;
    }
    return sorted;
  }, [isSearching, searchResults, browseResults, sortBy]);

  const isLoading = isSearching
    ? searchResults === undefined
    : status === "LoadingFirstPage";

  const isEmpty = isSearching
    ? searchResults !== undefined && searchResults.length === 0
    : browseResults.length === 0 && status === "Exhausted";

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
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search public sets..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {!isSearching && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
            >
              <option value="newest">Newest</option>
              <option value="name">Name A-Z</option>
              <option value="cards">Most Cards</option>
            </select>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-12">
            <p className="text-muted mb-4">
              {isSearching
                ? "No sets match your search."
                : "No public sets available yet. Be the first to share one!"}
            </p>
            {!isSearching && (
              <Link
                href="/sets"
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Go to My Sets
              </Link>
            )}
          </div>
        )}

        {displayResults.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayResults.map((set) => (
              <SetCard key={set._id} set={set} />
            ))}
          </div>
        )}

        {!isSearching && status === "CanLoadMore" && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => loadMore(12)}
              className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        {!isSearching && status === "LoadingMore" && (
          <div className="flex justify-center mt-6">
            <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        )}
      </main>
    </div>
  );
}
