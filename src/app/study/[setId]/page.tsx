"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FieldDefinition } from "@/lib/types";

export default function StudyConfigPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const set = useQuery(api.flashcardSets.get, {
    id: setId as Id<"flashcardSets">,
  });
  const cards = useQuery(api.flashcards.list, {
    setId: setId as Id<"flashcardSets">,
  });
  const activeSession = useQuery(api.studySessions.getActiveSession, {
    setId: setId as Id<"flashcardSets">,
  });
  const startSession = useMutation(api.studySessions.start);
  const router = useRouter();

  const [shuffle, setShuffle] = useState(true);
  const [cardLimit, setCardLimit] = useState<number | null>(null);
  const [mode, setMode] = useState<"study" | "browse">("study");
  const [frontFields, setFrontFields] = useState<string[]>([]);
  const [backFields, setBackFields] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (set === undefined || cards === undefined || activeSession === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (set === null) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Set not found.</p>
      </div>
    );
  }

  const fieldDefs = set.fieldDefinitions as FieldDefinition[];

  // Initialize front/back defaults on first render
  if (!initialized && fieldDefs.length > 0) {
    const sorted = [...fieldDefs].sort((a, b) => a.order - b.order);
    setFrontFields([sorted[0].name]);
    setBackFields(sorted.slice(1).map((f) => f.name));
    setInitialized(true);
  }

  const toggleField = (
    fieldName: string,
    side: "front" | "back"
  ) => {
    if (side === "front") {
      if (frontFields.includes(fieldName) && frontFields.length > 1) {
        setFrontFields(frontFields.filter((f) => f !== fieldName));
        setBackFields([...backFields, fieldName]);
      }
    } else {
      if (backFields.includes(fieldName) && backFields.length > 1) {
        setBackFields(backFields.filter((f) => f !== fieldName));
        setFrontFields([...frontFields, fieldName]);
      }
    }
  };

  const handleStart = async () => {
    if (frontFields.length === 0 || backFields.length === 0) return;
    setError(null);
    try {
      const sessionId = await startSession({
        setId: setId as Id<"flashcardSets">,
        frontFields,
        backFields,
        shuffle,
        ...(cardLimit !== null && { cardLimit }),
      });
      router.push(`/study/${setId}/session?sessionId=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleBrowse = () => {
    if (frontFields.length === 0 || backFields.length === 0) return;
    const params = new URLSearchParams({
      frontFields: frontFields.join(","),
      backFields: backFields.join(","),
      shuffle: String(shuffle),
      ...(cardLimit !== null && { cardLimit: String(cardLimit) }),
    });
    router.push(`/study/${setId}/browse?${params}`);
  };

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
              onClick={() => setMode(m)}
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
            Choose which fields to show (front) and which to recall (back).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2 text-accent">
                Front (shown)
              </h3>
              {frontFields.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleField(name, "front")}
                  className="block w-full text-left px-3 py-2 mb-1 text-sm bg-info-surface border border-info-edge rounded-lg hover:bg-surface-hover transition-colors"
                >
                  {name} &rarr;
                </button>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-accent">
                Back (recall)
              </h3>
              {backFields.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleField(name, "back")}
                  className="block w-full text-left px-3 py-2 mb-1 text-sm bg-info-surface border border-info-edge rounded-lg hover:bg-surface-hover transition-colors"
                >
                  &larr; {name}
                </button>
              ))}
            </div>
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
