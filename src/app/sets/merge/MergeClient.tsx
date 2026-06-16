"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePreloadedQuery, useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getDisplayableFields } from "@/lib/types";

type Props = {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
};

export default function MergeClient({ preloadedSets }: Props) {
  const setsResult = usePreloadedQuery(preloadedSets);
  const sets = useMemo(() => (setsResult.ok ? setsResult.value : []), [setsResult]);
  const router = useRouter();
  const mergeMutation = useMutation(api.flashcardSetsMerge.merge);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiveSource, setArchiveSource] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSets = useMemo(
    () => sets.filter((s) => selected.has(s._id)),
    [sets, selected]
  );

  const firstSchema = selectedSets[0]?.fieldDefinitions;
  const schemaMismatch = useMemo(() => {
    if (!firstSchema || selectedSets.length < 2) return false;
    const firstKey = JSON.stringify(firstSchema);
    return selectedSets.some((s) => JSON.stringify(s.fieldDefinitions) !== firstKey);
  }, [selectedSets, firstSchema]);

  const hasMemberOnly = selectedSets.some((s) => s.userSet.role !== "owner");
  const archiveDisabled = hasMemberOnly;

  const estimatedTotal = useMemo(() => {
    return selectedSets.reduce((sum, s) => sum + s.cardCount, 0);
  }, [selectedSets]);

  const canMerge = selected.size >= 2 && selected.size <= 5 && !schemaMismatch && estimatedTotal > 0 && !submitting;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMerge() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await mergeMutation({
        sourceSetIds: Array.from(selected) as Id<"flashcardSets">[],
        archiveSource: archiveSource && !archiveDisabled,
      });
      if (!result.ok) {
        setError(result.error.message);
        setSubmitting(false);
        return;
      }
      router.push(`/sets/${result.value.setId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Merge failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-4">
          <Link href="/sets" className="shrink-0 text-sm text-muted hover:text-foreground">
            &larr; Sets
          </Link>
          <h1 className="min-w-0 text-xl font-bold break-words">Merge Sets</h1>
        </div>
        <UserButton />
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
        <p className="text-sm text-muted">
          Select 2–5 sets with identical field schemas. Cards will be copied with fresh SRS history and deduplicated by exact field values.
        </p>

        <div className="border border-edge rounded-lg divide-y">
          {sets.map((s) => {
            const isSelected = selected.has(s._id);
            const fields = getDisplayableFields(s.fieldDefinitions);
            const disabledBySchema = selectedSets.length > 0 && firstSchema && JSON.stringify(s.fieldDefinitions) !== JSON.stringify(firstSchema);
            return (
              <label key={s._id} className={`flex items-center gap-3 p-3 ${disabledBySchema ? "opacity-50" : "hover:bg-surface-hover cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!!disabledBySchema}
                  onChange={() => toggle(s._id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted">
                    {s.cardCount} cards • {fields.map((f) => f.name).join(", ")} • {s.userSet.role}
                  </div>
                </div>
                {disabledBySchema && <span className="text-xs text-danger">Schema mismatch</span>}
              </label>
            );
          })}
          {sets.length === 0 && <div className="p-4 text-sm text-muted">No sets available.</div>}
        </div>

        <div className="space-y-2 text-sm">
          <div>Selected: {selected.size} sets • Estimated total cards: {estimatedTotal}</div>
          {schemaMismatch && <div className="text-danger">Selected sets have mismatching schemas.</div>}
          {estimatedTotal > 1000 && <div className="text-danger">Estimated exceeds 1000 card limit — merge will be rejected after deduplication check if over limit.</div>}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={archiveSource}
            disabled={archiveDisabled}
            onChange={(e) => setArchiveSource(e.target.checked)}
          />
          <span>
            Archive source sets after merge (hidden from lists, set private, SRS paused)
            {archiveDisabled && <span className="block text-muted">Disabled: some selected sets are member-only (owner required to archive).</span>}
          </span>
        </label>

        {error && <div className="text-sm text-danger">{error}</div>}

        <button
          onClick={handleMerge}
          disabled={!canMerge}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 text-sm"
        >
          {submitting ? "Merging..." : "Merge"}
        </button>
      </main>
    </div>
  );
}
