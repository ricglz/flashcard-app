"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useAiAvailablePreloaded } from "@/hooks/useAiAvailable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { METHODOLOGIES, METHODOLOGY_LABELS, type Methodology } from "@/lib/types";
import {
  formatWeakCardsReviewFilter,
  parseWeakCardsDateRangeParams,
} from "@/lib/weakCardsDateRange";
import { LinkButton } from "@/components/ui/LinkButton";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFailureMessage } from "@/lib/domainResultMessage";
import type { Id } from "../../../convex/_generated/dataModel";
import WeakCardsList from "./WeakCardsList";

const dateInputClassName =
  "h-10 w-full min-w-0 px-2.5 py-1.5 border border-edge rounded-lg bg-transparent text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-accent";

export default function WeakSpotsClient({
  preloadedSets,
  preloadedHasLlmKey,
}: {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
  preloadedHasLlmKey: Preloaded<typeof api.userSettings.hasLlmKey>;
}) {
  const [methodology, setMethodology] = useState<Methodology>("balanced");
  const [selectedSetId, setSelectedSetId] = useState<Id<"flashcardSets"> | undefined>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ai = useAiAvailablePreloaded(preloadedHasLlmKey);
  const userSetsResult = useOfflinePreloadedQuery(preloadedSets);
  const dateRange = useMemo(
    () => parseWeakCardsDateRangeParams(searchParams.get("from"), searchParams.get("to")),
    [searchParams],
  );
  const srsEnabledSets = useMemo(
    () => (userSetsResult.ok ? userSetsResult.value : []).filter((s) => s.userSet.srsEnabled),
    [userSetsResult],
  );
  const setFilterOptions = useMemo(
    () => ["", ...srsEnabledSets.map((set) => set._id)],
    [srsEnabledSets],
  );
  const setFilterLabels = useMemo<Record<string, string>>(
    () => ({
      "": "All SRS-enabled sets",
      ...Object.fromEntries(srsEnabledSets.map((set) => [set._id, set.name])),
    }),
    [srsEnabledSets],
  );

  const weakCardsResult = useQuery(
    api.weakAnalysis.getMyWeakCards,
    dateRange.ok
      ? {
          methodology,
          reviewFilter: dateRange.reviewFilter,
          ...(selectedSetId ? { setId: selectedSetId } : {}),
        }
      : "skip",
  );
  const weakCards = weakCardsResult?.ok ? weakCardsResult.value : null;
  const weakCardsError =
    !dateRange.ok
      ? dateRange.error
      : weakCardsResult && !weakCardsResult.ok
        ? getFailureMessage(weakCardsResult.error)
        : null;
  const generateHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("methodology", methodology);
    if (selectedSetId) params.set("setId", selectedSetId);
    if (dateRange.ok) {
      params.set("from", dateRange.from);
      params.set("to", dateRange.to);
    }
    return `/generate?${params.toString()}`;
  }, [dateRange, methodology, selectedSetId]);

  const totalWeakCards = useMemo(
    () => weakCards?.schemaGroups.reduce(
      (sum, g) => sum + g.sets.reduce((s, set) => s + set.weakCards.length, 0),
      0
    ) ?? 0,
    [weakCards]
  );

  const avgScore = useMemo(() => {
    if (!weakCards || totalWeakCards === 0) return 0;
    const total = weakCards.schemaGroups.reduce(
      (sum, g) => sum + g.sets.reduce(
        (s, set) => s + set.weakCards.reduce((ws, c) => ws + c.weakScore, 0),
        0
      ),
      0
    );
    return Math.round((total / totalWeakCards) * 10) / 10;
  }, [weakCards, totalWeakCards]);

  const updateDateParam = (name: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Weak Spots" backLabel="Back" />

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        {!userSetsResult.ok && <Alert variant="danger" className="mb-4">Could not load your sets: {getFailureMessage(userSetsResult.error)}</Alert>}

        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-2 md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,8.5rem)_minmax(0,8.5rem)]">
          <label className="block min-w-0 col-span-2 sm:col-span-1">
            <span className="block text-xs text-muted mb-1">Methodology</span>
            <Select
              value={methodology}
              options={METHODOLOGIES}
              labels={METHODOLOGY_LABELS}
              onChange={setMethodology}
              className="w-full min-w-0"
            />
          </label>
          <label className="block min-w-0 col-span-2 sm:col-span-1">
            <span className="block text-xs text-muted mb-1">Set</span>
            <Select
              value={selectedSetId ?? ""}
              options={setFilterOptions}
              labels={setFilterLabels}
              onChange={(value) => {
                setSelectedSetId(
                  srsEnabledSets.find((set) => set._id === value)?._id,
                );
              }}
              className="w-full min-w-0"
            />
          </label>
          <label className="block min-w-0">
            <span className="block text-xs text-muted mb-1">From</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => updateDateParam("from", event.target.value)}
              className={dateInputClassName}
            />
          </label>
          <label className="block min-w-0">
            <span className="block text-xs text-muted mb-1">To</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => updateDateParam("to", event.target.value)}
              className={dateInputClassName}
            />
          </label>
          {ai.available && totalWeakCards > 0 && (
            <LinkButton
              href={generateHref}
              size="sm"
              fullWidth
              className="whitespace-nowrap col-span-2 md:col-span-4"
            >
              Generate Remedial Cards
            </LinkButton>
          )}
        </div>

        {weakCards && (
          <p className="text-xs text-muted mb-4">
            Review range: {formatWeakCardsReviewFilter(weakCards.reviewFilter)}
          </p>
        )}

        {dateRange.ok && weakCardsResult === undefined && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {weakCardsError && (
          <div className="text-center py-12">
            <p className="text-muted">{weakCardsError}</p>
          </div>
        )}

        {weakCards && totalWeakCards === 0 && (
          <div className="text-center py-12">
            <p className="text-muted">No weak spots found for this range.</p>
          </div>
        )}

        {weakCards && totalWeakCards > 0 && (
          <WeakCardsList
            weakCards={weakCards}
            totalWeakCards={totalWeakCards}
            avgScore={avgScore}
          />
        )}
      </main>
    </div>
  );
}
