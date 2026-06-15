"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useAiAvailablePreloaded } from "@/hooks/useAiAvailable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VISIBILITIES, VISIBILITY_LABELS } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import SrsSetConfig from "@/components/SrsSetConfig";
import { useSaveHandler } from "@/hooks/useSaveHandler";
import { getFailureMessage } from "@/lib/domainResultMessage";
import { formatDate } from "@/lib/formatDate";
import type { TypedSetWithViewer } from "@/hooks/convex/useTypedFlashcardSet";
import CardsTable from "./CardsTable";
import SetDetailHeader from "./SetDetailHeader";
import VisitorActions from "./VisitorActions";
import AiAppendFlow from "./AiAppendFlow";
import ForkSyncBanner from "./ForkSyncBanner";

const DEFAULT_TTS_PLAYBACK_SPEED = 0.75;

type Flashcards = Extract<
  FunctionReturnType<typeof api.flashcards.list>,
  { ok: true }
>["value"];

export default function SetDetailInner({
  setId,
  setData,
  cards,
  preloadedTtsConfig,
  preloadedHasLlmKey,
  preloadedForkSyncStatus,
}: {
  setId: string;
  setData: TypedSetWithViewer;
  cards: Flashcards;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedHasLlmKey: Preloaded<typeof api.userSettings.hasLlmKey>;
  preloadedForkSyncStatus: Preloaded<typeof api.flashcardSets.getForkSyncStatus>;
}) {
  const { set, viewer } = setData;
  const router = useRouter();
  const ttsConfigResult = useOfflinePreloadedQuery(preloadedTtsConfig);
  const ai = useAiAvailablePreloaded(preloadedHasLlmKey);
  const updateVisibility = useMutation(api.flashcardSets.updateVisibility);
  const forkSet = useMutation(api.flashcardSets.fork);
  const [showAiAppend, setShowAiAppend] = useState(false);
  const {
    execute: executeVisibility,
    error: visibilityError,
  } = useSaveHandler<null>({
    fallbackErrorMessage: "Failed to update visibility",
  });
  const {
    execute: executeFork,
    isSaving: isForking,
    error: forkError,
  } = useSaveHandler<string>({
    fallbackErrorMessage: "Failed to fork set",
    onSuccess: (forkedSetId) => router.push(`/sets/${forkedSetId}`),
  });

  const sortedFieldDefs = [...set.fieldDefinitions].sort(
    (a, b) => a.order - b.order
  );

  const isOwner = viewer.role === "owner";
  const isMember = viewer.role !== "visitor";

  const handleFork = async () => {
    await executeFork(() => forkSet({ sourceSetId: set._id }));
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
        <p className="text-sm text-muted mb-2">
          Last updated: {formatDate(set.updatedAt)}
        </p>

        <div className="flex items-center gap-2 mb-6">
          <Badge
            variant={
              set.visibility === "public"
                ? "success"
                : set.visibility === "unlisted"
                  ? "warning"
                  : "neutral"
            }
          >
            {set.visibility.charAt(0).toUpperCase() + set.visibility.slice(1)}
          </Badge>
          {isOwner && (
            <Select
              value={set.visibility}
              options={VISIBILITIES}
              labels={VISIBILITY_LABELS}
              onChange={(visibility) => {
                void executeVisibility(() =>
                  updateVisibility({ id: set._id, visibility })
                );
              }}
              className="px-2 py-0.5 text-xs"
            />
          )}
        </div>
        {visibilityError && (
          <Alert variant="danger" className="mb-4">
            {visibilityError}
          </Alert>
        )}

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
            <Button
              onClick={handleFork}
              disabled={isForking}
              loading={isForking}
              variant="secondary"
            >
              Fork (Copy to My Sets)
            </Button>
            {forkError && (
              <Alert variant="danger" className="mt-2">
                {forkError}
              </Alert>
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

        {!ttsConfigResult.ok && (
          <Alert variant="danger" className="mb-4">
            Could not load TTS settings; using defaults. {getFailureMessage(ttsConfigResult.error)}
          </Alert>
        )}

        <CardsTable
          setId={setId}
          cards={cards}
          sortedFieldDefs={sortedFieldDefs}
          isOwner={isOwner}
          ttsPlaybackSpeed={
            ttsConfigResult.ok
              ? ttsConfigResult.value.ttsPlaybackSpeed
              : DEFAULT_TTS_PLAYBACK_SPEED
          }
        />
      </main>
    </div>
  );
}
