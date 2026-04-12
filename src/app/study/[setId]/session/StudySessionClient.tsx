"use client";

import { useState, useCallback } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import { FieldDefinition, CardRating, TypedFlashcardSet } from "@/lib/types";
import Link from "next/link";

/** Server component guarantees session is in_progress before rendering this client. */
type ActiveSession = Omit<Doc<"studySessions">, "status"> & {
  status: "in_progress";
};

type Props = {
  setId: string;
  sessionId: Id<"studySessions">;
  preloadedSession: Preloaded<typeof api.studySessions.get>;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
};

export default function StudySessionClient({
  setId,
  sessionId,
  preloadedSession,
  preloadedSet,
  preloadedCards,
}: Props) {
  const router = useRouter();

  // Server already validated these are non-null and session is in_progress.
  // usePreloadedQuery provides data immediately + real-time subscription.
  const session = usePreloadedQuery(preloadedSession) as ActiveSession;
  const set = usePreloadedQuery(preloadedSet) as TypedFlashcardSet;
  const cards = usePreloadedQuery(preloadedCards);
  const recordResult = useMutation(api.studySessions.recordResult);
  const abandonSession = useMutation(api.studySessions.abandon);

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting) return;
      const currentCardId = session.cardOrder[session.currentIndex];
      if (!currentCardId) return;

      const isLastCard =
        session.currentIndex === session.cardOrder.length - 1;

      setIsSubmitting(true);

      if (isLastCard) {
        // Navigate immediately — don't wait for the reactive update
        // that would push currentIndex out of bounds
        recordResult({ sessionId, cardId: currentCardId, rating });
        router.push(`/study/${setId}/results?sessionId=${sessionId}`);
        return;
      }

      try {
        await recordResult({ sessionId, cardId: currentCardId, rating });
        setRevealed(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [session, sessionId, isSubmitting, recordResult, router, setId]
  );

  const cardsMap = new Map(cards.map((c) => [c._id, c]));
  const currentCardId = session.cardOrder[session.currentIndex];
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;
  const fieldDefs = set.fieldDefinitions;

  // Session completed — currentIndex is past the last card.
  // Router.push to results is in flight; show a brief loading state.
  if (!currentCard) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/study/${setId}`}
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Back
          </Link>
          <span className="text-sm text-muted">
            {session.currentIndex + 1} / {session.cardOrder.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            {ttsEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              if (confirm("Abandon this session?")) {
                abandonSession({ sessionId });
                router.push(`/study/${setId}`);
              }
            }}
            className="text-sm text-danger hover:text-danger-hover transition-colors"
          >
            Abandon
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(session.currentIndex / session.cardOrder.length) * 100}%`,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <StudyCard
          key={currentCardId}
          card={currentCard}
          fieldDefinitions={fieldDefs}
          frontFields={session.frontFields}
          backFields={session.backFields}
          onRevealed={() => setRevealed(true)}
          autoPlayTts={ttsEnabled}
        />

        {revealed && (
          <div className="mt-8">
            <p className="text-center text-sm text-muted mb-3">
              How did you do?
            </p>
            <CardRatingButtons
              onRate={handleRate}
              disabled={isSubmitting}
            />
          </div>
        )}
      </main>
    </div>
  );
}
