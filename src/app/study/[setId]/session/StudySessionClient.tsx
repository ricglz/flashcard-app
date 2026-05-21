"use client";


import { useState, useCallback } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { asId } from "@/lib/convexHelpers";
import { useRouter } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import AssistantPanel from "@/components/AssistantPanel";
import StudyLayout from "@/components/StudyLayout";
import type { CardRating, ActiveStudySession } from "@/lib/types";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsForSetPreloaded } from "@/hooks/useCardAnnotations";
import Link from "next/link";

type Props = {
  setId: string;
  sessionId: Id<"studySessions">;
  preloadedSession: Preloaded<typeof api.studySessions.get>;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getForSet>;
};

export default function StudySessionClient({
  setId,
  sessionId,
  preloadedSession,
  preloadedSet,
  preloadedCards,
  preloadedTtsConfig,
  preloadedAnnotations,
}: Props) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const session = usePreloadedQuery(preloadedSession) as ActiveStudySession;
  const { set } = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const recordResult = useOfflineMutation(api.studySessions.recordResult);
  const abandonSession = useMutation(api.studySessions.abandon);
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } = useCardAnnotationsForSetPreloaded(preloadedAnnotations);

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localIndexOffset, setLocalIndexOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const effectiveIndex = session.currentIndex + localIndexOffset;

  if (session.currentIndex > 0 && localIndexOffset > 0) {
    const serverAdvanced = session.currentIndex >= effectiveIndex;
    if (serverAdvanced) {
      setLocalIndexOffset(0);
    }
  }

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting) return;
      const currentCardId = session.cardOrder[effectiveIndex];
      if (!currentCardId) return;
      setIsSubmitting(true);
      setError(null);

      const isLastCard = effectiveIndex === session.cardOrder.length - 1;

      if (isLastCard) {
        void recordResult({ sessionId, cardId: currentCardId, rating });
        if (isOnline) {
          router.push(`/study/${setId}/results?sessionId=${sessionId}`);
        }
        return;
      }

      try {
        const result = await recordResult({ sessionId, cardId: currentCardId, rating });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setRevealed(false);
        setLocalIndexOffset((o) => o + 1);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      session,
      sessionId,
      effectiveIndex,
      isSubmitting,
      isOnline,
      recordResult,
      router,
      setId,
    ],
  );

  const cardsMap = new Map(cards.map((c) => [c._id, c]));
  const currentCardId = session.cardOrder[effectiveIndex];
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;
  const fieldDefs = set.fieldDefinitions;

  if (!currentCard) {
    if (!isOnline) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Session complete!</h2>
          <p className="text-muted mb-4">
            Results will be available when you reconnect.
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <StudyLayout
      progress={{ current: effectiveIndex, total: session.cardOrder.length }}
      tts={tts}
      actionButton={{
        label: "Abandon",
        onClick: () => {
          if (confirm("Abandon this session?")) {
            void abandonSession({ sessionId });
            router.push(`/study/${setId}`);
          }
        },
      }}
      assistant={
        <AssistantPanel
          context={{
            setId: session.setId,
            setName: set.name,
            cardFields: currentCard.fields,
          }}
        />
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}
      <StudyCard
        key={currentCardId}
        card={currentCard}
        fieldDefinitions={fieldDefs}
        frontFields={session.frontFields}
        backFields={session.backFields}
        ttsOnlyFields={session.ttsOnlyFields}
        onRevealed={() => setRevealed(true)}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={currentCardId ? annotationMap.get(currentCardId) : undefined}
        onToggleFlag={() => {
          if (currentCardId) void toggleFlag({ cardId: currentCardId, setId: asId<"flashcardSets">(setId) });
        }}
        onSetNote={(note: string) => {
          if (currentCardId) void setNote({ cardId: currentCardId, setId: asId<"flashcardSets">(setId), note });
        }}
      />

      {revealed && (
        <div className="mt-8">
          <p className="text-center text-sm text-muted mb-3">
            How did you do?
          </p>
          <CardRatingButtons onRate={handleRate} disabled={isSubmitting} />
        </div>
      )}
    </StudyLayout>
  );
}
