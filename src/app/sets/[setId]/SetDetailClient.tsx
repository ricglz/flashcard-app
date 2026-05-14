"use client";

import { isFailureResult } from "@/lib/appResult";
import { useState } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TtsButton from "@/components/TtsButton";
import SrsSetConfig from "@/components/SrsSetConfig";
import { getTtsConfig } from "@/lib/types";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";

type Props = {
  setId: string;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
};

export default function SetDetailClient({
  setId,
  preloadedSet,
  preloadedCards,
}: Props) {
  const { set, viewer } = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const router = useRouter();
  const settings = useOfflineQuery(api.userSettings.get);
  const addToLibrary = useMutation(api.sharing.addToLibrary);
  const updateVisibility = useMutation(api.flashcardSets.updateVisibility);
  const forkSet = useMutation(api.flashcardSets.fork);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isForking, setIsForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  const sortedFieldDefs = [...set.fieldDefinitions].sort(
    (a, b) => a.order - b.order
  );

  const isOwner = viewer.role === "owner";
  const isMember = viewer.role !== "visitor";

  const handleAddToLibrary = async () => {
    setIsAdding(true);
    setAddError(null);
    try {
      const result = await addToLibrary({ setId: set._id });
      if (isFailureResult(result)) {
        setAddError(result.error.message);
        return;
      }
      router.refresh();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add to library"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleFork = async () => {
    setIsForking(true);
    setForkError(null);
    try {
      const result = await forkSet({ sourceSetId: set._id });
      if (isFailureResult(result)) {
        setForkError(result.error.message);
        return;
      }
      router.push(`/sets/${result.value}`);
    } catch (err) {
      setForkError(
        err instanceof Error ? err.message : "Failed to fork set"
      );
    } finally {
      setIsForking(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </button>
        <div className="flex gap-2">
          {isMember && (
            <Link
              href={`/study/${setId}`}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
            >
              Study
            </Link>
          )}
          {isOwner && (
            <Link
              href={`/sets/${setId}/edit`}
              className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
            >
              Edit
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-1">{set.name}</h1>
        {set.description && (
          <p className="text-muted mb-4">{set.description}</p>
        )}
        <p className="text-sm text-muted mb-2">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </p>

        <div className="flex items-center gap-2 mb-6">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            (set.visibility ?? "private") === "public"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : (set.visibility ?? "private") === "unlisted"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            {(set.visibility ?? "private").charAt(0).toUpperCase() + (set.visibility ?? "private").slice(1)}
          </span>
          {isOwner && (
            <select
              value={set.visibility ?? "private"}
              onChange={(e) => {
                void updateVisibility({
                  id: set._id,
                  visibility: e.target.value as "private" | "unlisted" | "public",
                });
              }}
              className="text-xs border border-edge rounded px-2 py-0.5 bg-transparent"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          )}
        </div>

        {set.origin?.kind === "forked" && (
          <p className="text-sm text-muted mb-4">
            Forked from{" "}
            <Link
              href={`/sets/${(set.origin as { sourceSetId: string }).sourceSetId}`}
              className="text-accent hover:underline"
            >
              original set
            </Link>
          </p>
        )}

        {viewer.role === "visitor" && (
          <div className="mb-6 p-4 border border-edge rounded-lg">
            <p className="text-sm text-muted mb-3">
              This set is not in your library yet.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAddToLibrary}
                disabled={isAdding}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add to My Library"}
              </button>
              <button
                onClick={handleFork}
                disabled={isForking}
                className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors disabled:opacity-50"
              >
                {isForking ? "Forking..." : "Fork (Copy to My Sets)"}
              </button>
            </div>
            {addError && (
              <p className="text-sm text-danger mt-2">{addError}</p>
            )}
            {forkError && (
              <p className="text-sm text-danger mt-2">{forkError}</p>
            )}
          </div>
        )}

        {viewer.userSet && (
          <div className="mb-6">
            <SrsSetConfig
              setId={set._id}
              srsEnabled={viewer.userSet.srsEnabled}
              defaultFrontFields={viewer.userSet.defaultFrontFields}
              defaultBackFields={viewer.userSet.defaultBackFields}
              defaultTtsOnlyFields={viewer.userSet.defaultTtsOnlyFields ?? []}
              fieldDefinitions={set.fieldDefinitions}
            />
          </div>
        )}

        {viewer.role === "member" && (
          <div className="mb-6">
            <button
              onClick={handleFork}
              disabled={isForking}
              className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors disabled:opacity-50"
            >
              {isForking ? "Forking..." : "Fork (Copy to My Sets)"}
            </button>
            {forkError && (
              <p className="text-sm text-danger mt-2">{forkError}</p>
            )}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-muted mb-3">No cards yet.</p>
            {isOwner && (
              <Link
                href={`/sets/${setId}/edit`}
                className="text-accent hover:underline text-sm"
              >
                Add cards
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-raised">
                  <th className="text-left px-4 py-2 text-xs text-muted">
                    #
                  </th>
                  {sortedFieldDefs.map((fd) => (
                    <th
                      key={fd.name}
                      className="text-left px-4 py-2 text-xs text-muted"
                    >
                      {fd.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cards
                  .sort((a, b) => a.order - b.order)
                  .map((card, idx) => (
                    <tr key={card._id} className="border-t hover:bg-surface-hover">
                      <td className="px-4 py-2 text-muted">{idx + 1}</td>
                      {sortedFieldDefs.map((fd) => {
                        const value = card.fields[fd.name] ?? "";
                        const ttsConfig = getTtsConfig(fd);
                        return (
                          <td key={fd.name} className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span>{value}</span>
                              {ttsConfig && value && (
                                <TtsButton
                                  text={value}
                                  lang={ttsConfig.lang}
                                  rate={settings?.ttsPlaybackSpeed}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
