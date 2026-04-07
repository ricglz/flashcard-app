"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import { FieldDefinition, CardRating } from "@/lib/types";
import Link from "next/link";

export default function StudySessionPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") as Id<"studySessions"> | null;
  const router = useRouter();

  const session = useQuery(
    api.studySessions.get,
    sessionId ? { id: sessionId } : "skip"
  );
  const set = useQuery(api.flashcardSets.get, {
    id: setId as Id<"flashcardSets">,
  });
  const cards = useQuery(api.flashcards.list, {
    setId: setId as Id<"flashcardSets">,
  });
  const recordResult = useMutation(api.studySessions.recordResult);
  const abandonSession = useMutation(api.studySessions.abandon);

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (!session || !sessionId || isSubmitting) return;
      const currentCardId = session.cardOrder[session.currentIndex];
      if (!currentCardId) return;

      setIsSubmitting(true);
      try {
        const result = await recordResult({
          sessionId,
          cardId: currentCardId,
          rating,
        });
        setRevealed(false);
        if (result.isComplete) {
          router.push(`/study/${setId}/results?sessionId=${sessionId}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [session, sessionId, isSubmitting, recordResult, router, setId]
  );

  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No session specified.</p>
        <Link
          href={`/study/${setId}`}
          className="text-accent hover:underline"
        >
          Start a new session
        </Link>
      </div>
    );
  }

  if (
    session === undefined ||
    set === undefined ||
    cards === undefined
  ) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !set) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Session not found.</p>
      </div>
    );
  }

  if (session.status === "completed") {
    router.push(`/study/${setId}/results?sessionId=${sessionId}`);
    return null;
  }

  const cardsMap = new Map(cards.map((c) => [c._id, c]));
  const currentCardId = session.cardOrder[session.currentIndex];
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;
  const fieldDefs = set.fieldDefinitions as FieldDefinition[];

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Card not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-4 flex items-center justify-between">
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
        <button
          onClick={async () => {
            if (confirm("Abandon this session?")) {
              await abandonSession({ sessionId });
              router.push(`/study/${setId}`);
            }
          }}
          className="text-sm text-danger hover:text-danger-hover transition-colors"
        >
          Abandon
        </button>
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

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <StudyCard
          card={currentCard}
          fieldDefinitions={fieldDefs}
          frontFields={session.frontFields}
          backFields={session.backFields}
          onRevealed={() => setRevealed(true)}
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
