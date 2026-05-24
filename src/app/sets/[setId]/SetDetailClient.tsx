"use client";


import { useState } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useAiAvailablePreloaded } from "@/hooks/useAiAvailable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VISIBILITIES, VISIBILITY_LABELS } from "@/lib/types";
import TypedSelect from "@/components/TypedSelect";
import SrsSetConfig from "@/components/SrsSetConfig";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import CardsTable from "./CardsTable";
import SetDetailHeader from "./SetDetailHeader";
import VisitorActions from "./VisitorActions";
import AiAppendFlow from "./AiAppendFlow";
import ForkSyncBanner from "./ForkSyncBanner";

type Props = {
  setId: string;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedHasLlmKey: Preloaded<typeof api.userSettings.hasLlmKey>;
  preloadedForkSyncStatus: Preloaded<typeof api.flashcardSets.getForkSyncStatus>;
};

export default function SetDetailClient({
  setId,
  preloadedSet,
  initialSet,
  preloadedCards,
  preloadedTtsConfig,
  preloadedHasLlmKey,
  preloadedForkSyncStatus,
}: Props) {
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);
  const cards = cardsResult.ok ? cardsResult.value : [];
  const router = useRouter();
  const ttsConfig = useOfflinePreloadedQuery(preloadedTtsConfig);
  const ai = useAiAvailablePreloaded(preloadedHasLlmKey);
  const updateVisibility = useMutation(api.flashcardSets.updateVisibility);
  const forkSet = useMutation(api.flashcardSets.fork);
  const [isForking, setIsForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);
  const [showAiAppend, setShowAiAppend] = useState(false);

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} />;
  }
  const { set, viewer } = setResult.value;

  const sortedFieldDefs = [...set.fieldDefinitions].sort(
    (a, b) => a.order - b.order
  );

  const isOwner = viewer.role === "owner";
  const isMember = viewer.role !== "visitor";

  if (!cardsResult.ok) return null;

  const handleFork = async () => {
    setIsForking(true);
    setForkError(null);
    try {
      const result = await forkSet({ sourceSetId: set._id });
      if (!result.ok) {
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
      <SetDetailHeader
        setId={setId}
        isMember={isMember}
        isOwner={isOwner}
        aiAvailable={ai.available}
        onBack={() => router.back()}
        onAiGenerate={() => setShowAiAppend(true)}
      />

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
            set.visibility === "public"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : set.visibility === "unlisted"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            {set.visibility.charAt(0).toUpperCase() + set.visibility.slice(1)}
          </span>
          {isOwner && (
            <TypedSelect
              value={set.visibility}
              options={VISIBILITIES}
              labels={VISIBILITY_LABELS}
              onChange={(visibility) => {
                void updateVisibility({ id: set._id, visibility });
              }}
              className="text-xs border border-edge rounded px-2 py-0.5 bg-transparent"
            />
          )}
        </div>

        {set.origin.kind === "forked" && (
          <p className="text-sm text-muted mb-4">
            Forked from{" "}
            <Link
              href={`/sets/${set.origin.sourceSetId}`}
              className="text-accent hover:underline"
            >
              original set
            </Link>
          </p>
        )}

        <ForkSyncBanner preloaded={preloadedForkSyncStatus} />

        {viewer.role === "visitor" && (
          <VisitorActions
            setId={set._id}
            isForking={isForking}
            forkError={forkError}
            onFork={handleFork}
          />
        )}

        {viewer.userSet && (
          <div className="mb-6">
            <SrsSetConfig
              setId={set._id}
              srsEnabled={viewer.userSet.srsEnabled}
              defaultFrontFields={viewer.userSet.defaultFrontFields}
              defaultBackFields={viewer.userSet.defaultBackFields}
              defaultTtsOnlyFields={viewer.userSet.defaultTtsOnlyFields}
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

        {showAiAppend && (
          <div className="mb-6">
            <AiAppendFlow
              setId={set._id}
              fieldDefinitions={set.fieldDefinitions}
              onClose={() => setShowAiAppend(false)}
            />
          </div>
        )}

        <CardsTable
          setId={setId}
          cards={cards}
          sortedFieldDefs={sortedFieldDefs}
          isOwner={isOwner}
          ttsPlaybackSpeed={ttsConfig?.ttsPlaybackSpeed}
        />
      </main>
    </div>
  );
}
