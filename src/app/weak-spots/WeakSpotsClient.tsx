"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";
import { useAiAvailablePreloaded } from "@/hooks/useAiAvailable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { asId } from "@/lib/convexHelpers";
import type { Methodology } from "@/lib/types";
import type { WeakReason } from "@/lib/aiToolingSchemas";

const METHODOLOGY_LABELS: Record<Methodology, string> = {
  balanced: "Balanced",
  recent_lapses: "Recent Lapses",
  low_ease: "Low Ease",
  learning_stuck: "Learning Stuck",
};

const REASON_LABELS: Record<WeakReason, string> = {
  recent_wrong_rating: "Wrong",
  recent_hard_rating: "Hard",
  low_ease_factor: "Low Ease",
  learning_status: "Learning",
  many_reviews_not_graduated: "Not Graduating",
  recently_due_again: "Due Again",
};

export default function WeakSpotsClient({
  preloadedSets,
  preloadedHasLlmKey,
}: {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
  preloadedHasLlmKey: Preloaded<typeof api.userSettings.hasLlmKey>;
}) {
  const [methodology, setMethodology] = useState<Methodology>("balanced");
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>();
  const router = useRouter();

  const ai = useAiAvailablePreloaded(preloadedHasLlmKey);
  const userSets = useOfflinePreloadedQuery(preloadedSets);
  const srsEnabledSets = useMemo(
    () => userSets.filter((s) => s.userSet.srsEnabled),
    [userSets]
  );

  const weakCards = useQuery(
    api.weakAnalysis.getMyWeakCards,
    { methodology, ...(selectedSetId ? { setId: asId<"flashcardSets">(selectedSetId) } : {}) }
  );

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

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-bold">Weak Spots</h1>
        <div className="w-14" />
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex gap-3 mb-6">
          <select
            value={methodology}
            onChange={(e) => setMethodology(e.target.value as Methodology)}
            className="px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          >
            {Object.entries(METHODOLOGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={selectedSetId ?? ""}
            onChange={(e) => setSelectedSetId(e.target.value || undefined)}
            className="flex-1 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          >
            <option value="">All SRS-enabled sets</option>
            {srsEnabledSets.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          {ai.available && totalWeakCards > 0 && (
            <Link
              href={`/generate?methodology=${methodology}${selectedSetId ? `&setId=${selectedSetId}` : ""}`}
              className="px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              Generate Remedial Cards
            </Link>
          )}
        </div>

        {weakCards === undefined && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        )}

        {weakCards && totalWeakCards === 0 && (
          <div className="text-center py-12">
            <p className="text-muted">No weak spots found. Keep studying!</p>
          </div>
        )}

        {weakCards && totalWeakCards > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 border border-edge rounded-lg">
                <p className="text-xs text-muted">Weak Cards</p>
                <p className="text-2xl font-bold">{totalWeakCards}</p>
              </div>
              <div className="p-3 border border-edge rounded-lg">
                <p className="text-xs text-muted">Avg Score</p>
                <p className="text-2xl font-bold">{avgScore}</p>
              </div>
            </div>

            {weakCards.schemaGroups.map((group) =>
              group.sets.map((set) => (
                <div key={set.setId} className="mb-6">
                  <h3 className="font-semibold mb-3">
                    <Link
                      href={`/sets/${set.setId}`}
                      className="text-accent hover:underline"
                    >
                      {set.name}
                    </Link>
                    <span className="text-sm text-muted ml-2">
                      ({set.weakCards.length} weak)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {set.weakCards.map((card) => (
                      <div
                        key={card.cardId}
                        className="border border-edge rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 text-sm">
                            {Object.entries(card.fields).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                <span className="text-muted">{key}:</span> {value}
                              </span>
                            ))}
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                            card.weakScore >= 10
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : card.weakScore >= 5
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {Math.round(card.weakScore * 10) / 10}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {card.weakReasons.map((reason) => (
                            <span
                              key={reason}
                              className="px-1.5 py-0.5 bg-surface-hover rounded text-xs text-muted"
                            >
                              {REASON_LABELS[reason]}
                            </span>
                          ))}
                          <span className="px-1.5 py-0.5 text-xs text-muted">
                            ease: {card.metrics.easeFactor.toFixed(1)} | reviews: {card.metrics.reviewCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}
