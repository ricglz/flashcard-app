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
  const [frontFields, setFrontFields] = useState<string[]>([]);
  const [backFields, setBackFields] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (set === undefined || cards === undefined || activeSession === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (set === null) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Set not found.</p>
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
      if (frontFields.includes(fieldName)) {
        setFrontFields(frontFields.filter((f) => f !== fieldName));
        setBackFields([...backFields, fieldName]);
      }
    } else {
      if (backFields.includes(fieldName)) {
        setBackFields(backFields.filter((f) => f !== fieldName));
        setFrontFields([...frontFields, fieldName]);
      }
    }
  };

  const handleStart = async () => {
    if (frontFields.length === 0 || backFields.length === 0) return;
    const sessionId = await startSession({
      setId: setId as Id<"flashcardSets">,
      frontFields,
      backFields,
      shuffle,
    });
    router.push(`/study/${setId}/session?sessionId=${sessionId}`);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </Link>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Study: {set.name}</h1>
        <p className="text-sm text-gray-500">{cards.length} cards</p>

        {/* Resume existing session */}
        {activeSession && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Resume
              </button>
              <Link
                href={`/study/${setId}/results?sessionId=${activeSession._id}`}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                View Results So Far
              </Link>
            </div>
          </div>
        )}

        {/* Field selection */}
        <div className="space-y-4">
          <h2 className="font-semibold">Study Direction</h2>
          <p className="text-xs text-gray-400">
            Choose which fields to show (front) and which to recall (back).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2 text-green-700">
                Front (shown)
              </h3>
              {frontFields.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleField(name, "front")}
                  className="block w-full text-left px-3 py-2 mb-1 text-sm bg-green-50 border border-green-200 rounded hover:bg-green-100"
                >
                  {name} &rarr;
                </button>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-blue-700">
                Back (recall)
              </h3>
              {backFields.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleField(name, "back")}
                  className="block w-full text-left px-3 py-2 mb-1 text-sm bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
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

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={
            frontFields.length === 0 ||
            backFields.length === 0 ||
            cards.length === 0
          }
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          Start New Session
        </button>
      </main>
    </div>
  );
}
