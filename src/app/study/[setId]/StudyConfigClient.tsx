"use client";


import { useState } from "react";
import type { Preloaded } from "convex/react";
import { useConvexAuth, usePreloadedQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import { useFieldAssignment } from "@/hooks/useFieldAssignment";
import ResumeSessionBanner from "./ResumeSessionBanner";
import FieldSelectionList from "./FieldSelectionList";
import CardLimitSelector from "./CardLimitSelector";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

type Props = {
  flashcardSetId: Id<"flashcardSets">;
  initialMode: "study" | "browse";
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedActiveSession: Preloaded<
    typeof api.studySessions.getActiveSession
  >;
  initialSet: FlashcardSetWithViewer;
  userSet: Doc<"userSets">;
};

function updateModeInUrl(
  mode: "study" | "browse",
  replace: (href: string) => void,
) {
  const url = new URL(window.location.href);
  if (mode === "browse") {
    url.searchParams.set("mode", "browse");
  } else {
    url.searchParams.delete("mode");
  }
  replace(url.pathname + url.search);
}

export default function StudyConfigClient({
  flashcardSetId,
  initialMode,
  preloadedSet,
  preloadedCards,
  preloadedActiveSession,
  initialSet,
  userSet,
}: Props) {
  const setId = String(flashcardSetId);
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);
  const cards = cardsResult.ok ? cardsResult.value : [];
  const activeSession = usePreloadedQuery(preloadedActiveSession);
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
    fieldDefinitions: setResult.ok ? setResult.value.set.fieldDefinitions : [],
  });
  const { frontFields, backFields, ttsOnlyFields } = assignment;

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/sets/${setId}`} label="Back to set" />;
  }
  const { set } = setResult.value;
  const fieldDefs = set.fieldDefinitions;

  const handleToggle = (fieldName: string) => {
    toggleField(fieldName);
  };

  const handleStart = async () => {
    if (frontFields.length === 0 || backFields.length === 0) return;
    if (!convexAuth.isAuthenticated) {
      setError("Please sign in to continue.");
      return;
    }
    setError(null);
    setIsNavigating(true);
    try {
      const result = await startSession({
        setId: flashcardSetId,
        frontFields,
        backFields,
        ttsOnlyFields,
        shuffle,
        ...(cardLimit !== null && { cardLimit }),
      });
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
    if (frontFields.length === 0 || backFields.length === 0) return;
    const params = new URLSearchParams({
      frontFields: frontFields.join(","),
      backFields: backFields.join(","),
      shuffle: String(shuffle),
      ...(ttsOnlyFields.length > 0 && { ttsOnlyFields: ttsOnlyFields.join(",") }),
      ...(cardLimit !== null && { cardLimit: String(cardLimit) }),
    });
    router.push(`/study/${setId}/browse?${params}`);
  };

  if (!cardsResult.ok) return null;

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

        <div className="flex gap-2">
          {(["study", "browse"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                updateModeInUrl(m, (href) => router.replace(href));
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
            disabled={
              frontFields.length === 0 ||
              backFields.length === 0 ||
              cards.length === 0 ||
              (mode === "study" && !convexAuth.isAuthenticated)
            }
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
