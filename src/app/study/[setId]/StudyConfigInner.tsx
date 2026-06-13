"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import { useConvexAuth, usePreloadedQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TypedSetWithViewer } from "@/hooks/convex/useTypedFlashcardSet";
import InlineError from "@/components/InlineError";
import { getFailureMessage } from "@/lib/domainResultMessage";
import { useFieldAssignment } from "@/hooks/useFieldAssignment";
import ResumeSessionBanner from "./ResumeSessionBanner";
import FieldSelectionList from "./FieldSelectionList";
import CardLimitSelector from "./CardLimitSelector";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  buildBrowseSearchParams,
  buildStartSessionArgs,
  buildStudyModeHref,
  canSubmitStudyConfig,
  hasRequiredStudyFields,
} from "./studyConfigState";

type Flashcards = Extract<
  FunctionReturnType<typeof api.flashcards.list>,
  { ok: true }
>["value"];

export default function StudyConfigInner({
  flashcardSetId,
  initialMode,
  setData,
  cards,
  preloadedActiveSession,
  userSet,
}: {
  flashcardSetId: Id<"flashcardSets">;
  initialMode: "study" | "browse";
  setData: TypedSetWithViewer;
  cards: Flashcards;
  preloadedActiveSession: Preloaded<
    typeof api.studySessions.getActiveSession
  >;
  userSet: Doc<"userSets">;
}) {
  const setId = String(flashcardSetId);
  const activeSessionResult = usePreloadedQuery(preloadedActiveSession);
  const activeSession = activeSessionResult.ok ? activeSessionResult.value : null;
  const activeSessionError = activeSessionResult.ok
    ? null
    : `Could not load active session: ${getFailureMessage(activeSessionResult.error)}`;
  const startSession = useMutation(api.studySessions.start);
  const convexAuth = useConvexAuth();
  const router = useRouter();

  const [shuffle, setShuffle] = useState(true);
  const [cardLimit, setCardLimit] = useState<number | null>(null);
  const [mode, setMode] = useState<"study" | "browse">(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const { assignment, toggleField } = useFieldAssignment({
    initial: {
      frontFields: userSet.defaultFrontFields,
      backFields: userSet.defaultBackFields,
      ttsOnlyFields: userSet.defaultTtsOnlyFields,
    },
    fieldDefinitions: setData.set.fieldDefinitions,
  });
  const { frontFields, backFields, ttsOnlyFields } = assignment;

  const { set } = setData;
  const fieldDefs = set.fieldDefinitions;

  const handleToggle = (fieldName: string) => {
    toggleField(fieldName);
  };

  const handleStart = async () => {
    if (!hasRequiredStudyFields({ frontFields, backFields })) return;
    if (!convexAuth.isAuthenticated) {
      setError("Please sign in to continue.");
      return;
    }
    setError(null);
    setIsNavigating(true);
    try {
      const result = await startSession(buildStartSessionArgs({
        setId: flashcardSetId,
        frontFields,
        backFields,
        ttsOnlyFields,
        shuffle,
        cardLimit,
      }));
      if (!result.ok) {
        setIsNavigating(false);
        setError(result.error.message);
        return;
      }
      router.push(`/study/${setId}/session?sessionId=${result.value}`);
    } catch (err) {
      setIsNavigating(false);
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleBrowse = () => {
    if (!hasRequiredStudyFields({ frontFields, backFields })) return;
    const params = buildBrowseSearchParams({
      frontFields,
      backFields,
      ttsOnlyFields,
      shuffle,
      cardLimit,
    });
    router.push(`/study/${setId}/browse?${params}`);
  };

  if (isNavigating) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-foreground">&larr; Back</Link>
        <Link href={`/sets/${setId}/edit`} className="text-sm text-muted hover:text-foreground">Edit Set</Link>
      </header>

      <main className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Study: {set.name}</h1>
        <p className="text-sm text-muted">{cards.length} cards</p>
        <InlineError message={activeSessionError} />

        <div className="flex gap-2">
          {(["study", "browse"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                router.replace(buildStudyModeHref(window.location.href, m));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-accent text-white"
                  : "border border-edge hover:bg-surface-hover"
              }`}
            >
              {m === "study" ? "Study" : "Browse"}
            </button>
          ))}
        </div>

        {mode === "study" && activeSession && (
          <ResumeSessionBanner setId={setId} activeSession={activeSession} />
        )}

        <FieldSelectionList
          fieldDefs={fieldDefs}
          frontFields={frontFields}
          backFields={backFields}
          ttsOnlyFields={ttsOnlyFields}
          onToggle={handleToggle}
        />

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Shuffle cards</span>
        </label>

        <CardLimitSelector
          cardLimit={cardLimit}
          onCardLimitChange={setCardLimit}
          totalCards={cards.length}
        />

        <div className="space-y-2">
          <button
            onClick={mode === "study" ? handleStart : handleBrowse}
            disabled={!canSubmitStudyConfig({
              mode,
              frontFields,
              backFields,
              cardCount: cards.length,
              isAuthenticated: convexAuth.isAuthenticated,
            })}
            className="w-full py-3 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 font-medium transition-colors"
          >
            {mode === "study" ? "Start New Session" : "Start Browsing"}
          </button>
          {cards.length === 0 && (
            <p className="text-xs text-muted text-center">
              This set has no cards. Add cards before studying.
            </p>
          )}
          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}
