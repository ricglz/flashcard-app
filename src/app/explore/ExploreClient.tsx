"use client";

import { useState, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { SetCard } from "./SetCard";
import FilterBar, {
  collectLanguages,
  detectLanguage,
  matchesCardCountRange,
  type CardCountRange,
} from "./FilterBar";

const SORT_OPTIONS = ["updated", "newest", "name", "cards"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const SORT_LABELS: Record<SortOption, string> = {
  updated: "Last updated",
  newest: "Date created",
  name: "Name A-Z",
  cards: "Most Cards",
};

function isSortOption(value: string | null): value is SortOption {
  return value === "updated" || value === "newest" || value === "name" || value === "cards";
}

export default function ExploreClient() {
  const [searchInput, setSearchInput] = useState("");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sortParam = searchParams.get("sort");
  const sortBy: SortOption = isSortOption(sortParam) ? sortParam : "updated";
  const [cardCountRange, setCardCountRange] = useState<CardCountRange>("any");
  const [languageTag, setLanguageTag] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isSearching = debouncedSearch.length > 0;

  const { results: browseResults, status, loadMore } = usePaginatedQuery(
    api.flashcardSets.listPublic,
    isSearching ? "skip" : {},
    { initialNumItems: 12 }
  );

  const searchResults = useQuery(
    api.flashcardSets.searchPublicCombined,
    isSearching ? { searchTerm: debouncedSearch } : "skip"
  );

  const updateSort = (next: SortOption) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "updated") {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const allResults = useMemo(() => {
    if (isSearching) return searchResults ?? [];
    const sorted = [...browseResults];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "cards":
        sorted.sort((a, b) => b.cardCount - a.cardCount);
        break;
      case "newest":
        sorted.sort((a, b) => {
          const aTime = a.createdAt;
          const bTime = b.createdAt;
          return bTime - aTime;
        });
        break;
      case "updated":
      default:
        sorted.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }
    return sorted;
  }, [isSearching, searchResults, browseResults, sortBy]);

  const availableLanguages = useMemo(
    () => collectLanguages(allResults),
    [allResults],
  );

  const displayResults = useMemo(() => {
    return allResults.filter((set) => {
      if (!matchesCardCountRange(set.cardCount, cardCountRange)) return false;
      if (languageTag !== null && detectLanguage(set.fieldDefinitions) !== languageTag) return false;
      return true;
    });
  }, [allResults, cardCountRange, languageTag]);

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
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search public sets..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {!isSearching && (
            <Select
              value={sortBy}
              options={SORT_OPTIONS}
              labels={SORT_LABELS}
              onChange={updateSort}
            />
          )}
        </div>

        <FilterBar
          cardCountRange={cardCountRange}
          onCardCountRangeChange={setCardCountRange}
          languageTag={languageTag}
          onLanguageTagChange={setLanguageTag}
          availableLanguages={availableLanguages}
        />

        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
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
              <LinkButton
                href="/sets"
              >
                Go to My Sets
              </LinkButton>
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
            <Button
              onClick={() => loadMore(12)}
              variant="secondary"
            >
              Load More
            </Button>
          </div>
        )}

        {!isSearching && status === "LoadingMore" && (
          <div className="flex justify-center mt-6">
            <Spinner size="md" />
          </div>
        )}
      </main>
    </div>
  );
}
