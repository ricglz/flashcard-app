"use client";

import { useState } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TypedFlashcardSet, getTtsConfig } from "@/lib/types";
import { asId } from "@/lib/convexHelpers";
import { cycleFieldAssignment } from "@/lib/fieldToggle";

type Props = {
  setId: string;
  initialMode: "study" | "browse";
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedActiveSession: Preloaded<
    typeof api.studySessions.getActiveSession
  >;
  preloadedUserSet: Preloaded<typeof api.userSets.get>;
};

export default function StudyConfigClient({
  setId,
  initialMode,
  preloadedSet,
  preloadedCards,
  preloadedActiveSession,
  preloadedUserSet,
}: Props) {
  const set = usePreloadedQuery(preloadedSet) as TypedFlashcardSet;
  const cards = usePreloadedQuery(preloadedCards);
  const activeSession = usePreloadedQuery(preloadedActiveSession);
  const userSet = usePreloadedQuery(preloadedUserSet);
  const startSession = useMutation(api.studySessions.start);
  const router = useRouter();
  const flashcardSetId = asId<"flashcardSets">(setId);

  const [shuffle, setShuffle] = useState(true);
  const [cardLimit, setCardLimit] = useState<number | null>(null);
  const [mode, setMode] = useState<"study" | "browse">(initialMode);
  const [frontFields, setFrontFields] = useState<string[]>([]);
  const [backFields, setBackFields] = useState<string[]>([]);
  const [ttsOnlyFields, setTtsOnlyFields] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const fieldDefs = set.fieldDefinitions;

  // Initialize front/back defaults from userSet (SRS defaults) or field order
  if (!initialized && fieldDefs.length > 0) {
    if (userSet) {
      setFrontFields(userSet.defaultFrontFields);
      setBackFields(userSet.defaultBackFields);
      setTtsOnlyFields(
        (userSet as Record<string, unknown>).defaultTtsOnlyFields as string[] ?? []
      );
    } else {
      const sorted = [...fieldDefs].sort((a, b) => a.order - b.order);
      setFrontFields([sorted[0].name]);
      setBackFields(sorted.slice(1).map((f) => f.name));
    }
    setInitialized(true);
  }

  const handleToggle = (fieldName: string) => {
    const fd = fieldDefs.find((d) => d.name === fieldName);
    const hasTts = fd ? getTtsConfig(fd) !== null : false;
    const result = cycleFieldAssignment(
      fieldName,
      { frontFields, backFields, ttsOnlyFields },
      hasTts
    );
    setFrontFields(result.frontFields);
    setBackFields(result.backFields);
    setTtsOnlyFields(result.ttsOnlyFields);
  };

  const handleStart = async () => {
    if (frontFields.length === 0 || backFields.length === 0) return;
    setError(null);
    setIsNavigating(true);
    try {
      const sessionId = await startSession({
        setId: flashcardSetId,
        frontFields,
        backFields,
        ttsOnlyFields,
        shuffle,
        ...(cardLimit !== null && { cardLimit }),
      });
      router.push(`/study/${setId}/session?sessionId=${sessionId}`);
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
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Back
        </Link>
        <Link
          href={`/sets/${setId}/edit`}
          className="text-sm text-muted hover:text-foreground"
        >
          Edit Set
        </Link>
      </header>

      <main className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Study: {set.name}</h1>
        <p className="text-sm text-muted">{cards.length} cards</p>

        {/* Mode selector */}
        <div className="flex gap-2">
          {(["study", "browse"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                const url = new URL(window.location.href);
                if (m === "browse") {
                  url.searchParams.set("mode", "browse");
                } else {
                  url.searchParams.delete("mode");
                }
                router.replace(url.pathname + url.search);
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

        {/* Resume existing session */}
        {mode === "study" && activeSession && (
          <div className="p-4 bg-info-surface border border-info-edge rounded-lg">
            <p className="text-sm font-medium mb-2">
              You have an active session ({activeSession.currentIndex}/
              {activeSession.cardOrder.length} cards done)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  router.push(
                    `/study/${setId}/session?sessionId=${activeSession._id}`
                  )
                }
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
              >
                Resume
              </button>
              <Link
                href={`/study/${setId}/results?sessionId=${activeSession._id}`}
                className="px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
              >
                View Results So Far
              </Link>
            </div>
          </div>
        )}

        {/* Field selection */}
        <div className="space-y-4">
          <h2 className="font-semibold">Study Direction</h2>
          <p className="text-xs text-muted">
            Tap a field to cycle: Front → Back{" "}
            {fieldDefs.some((fd) => getTtsConfig(fd) !== null) && "→ TTS Only "}→ Front
          </p>

          <div className="space-y-2">
            {fieldDefs
              .sort((a, b) => a.order - b.order)
              .map((fd) => {
                const name = fd.name;
                const isFront = frontFields.includes(name);
                const isBack = backFields.includes(name);
                const isTtsOnly = ttsOnlyFields.includes(name);
                const label = isFront
                  ? "Front"
                  : isBack
                    ? "Back"
                    : isTtsOnly
                      ? "TTS Only"
                      : "Front";
                const style = isFront
                  ? "bg-accent/10 border-accent text-accent"
                  : isBack
                    ? "bg-warning/10 border-warning text-warning"
                    : isTtsOnly
                      ? "bg-info-surface border-info-edge text-muted"
                      : "border-edge text-muted";
                return (
                  <button
                    key={name}
                    onClick={() => handleToggle(name)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-surface-hover flex justify-between items-center ${style}`}
                  >
                    <span>{name}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Shuffle toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Shuffle cards</span>
        </label>

        {/* Card limit */}
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Cards to study</h2>
          <div className="flex gap-2">
            {[10, 20, 50].map((n) => (
              <button
                key={n}
                onClick={() => setCardLimit(n)}
                disabled={cards.length < n}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  cardLimit === n
                    ? "bg-accent text-white"
                    : "border border-edge hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setCardLimit(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cardLimit === null
                  ? "bg-accent text-white"
                  : "border border-edge hover:bg-surface-hover"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Start button */}
        <div className="space-y-2">
          <button
            onClick={mode === "study" ? handleStart : handleBrowse}
            disabled={
              frontFields.length === 0 ||
              backFields.length === 0 ||
              cards.length === 0
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
