"use client";


import { useState, useCallback, useEffect, useMemo } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
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
import StudySessionLocalResults, {
  type LocalStudyResult,
} from "./StudySessionLocalResults";

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

  const session = usePreloadedQuery(preloadedSession) as ActiveStudySession;
  const { set } = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const recordResult = useOfflineMutation(api.studySessions.recordResult, {
    strategy: "queue-first",
  });
  const abandonSession = useMutation(api.studySessions.abandon);
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } = useCardAnnotationsForSetPreloaded(preloadedAnnotations);

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localIndex, setLocalIndex] = useState(() => session.currentIndex);
  const [localResults, setLocalResults] = useState<LocalStudyResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalIndex((index) =>
      session.currentIndex > index ? session.currentIndex : index,
    );
  }, [session.currentIndex]);

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting) return;
      const currentCardId = session.cardOrder[localIndex];
      if (!currentCardId) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await recordResult({ sessionId, cardId: currentCardId, rating });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setRevealed(false);
        setLocalResults((previous) => [...previous, { cardId: currentCardId, rating }]);
        setLocalIndex((index) => Math.max(index, localIndex + 1));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      session,
      sessionId,
      localIndex,
      isSubmitting,
      recordResult,
    ],
  );

  const cardsMap = useMemo(() => new Map(cards.map((c) => [c._id, c])), [cards]);
  const currentCardId = session.cardOrder[localIndex];
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;
  const fieldDefs = set.fieldDefinitions;
  const sessionComplete = localIndex >= session.cardOrder.length;
  const completedCards = Math.min(
    session.cardOrder.length,
    Math.max(localIndex, session.currentIndex),
  );

  if (sessionComplete) {
    return (
      <StudySessionLocalResults
        setId={setId}
        setName={set.name}
        results={localResults}
        cards={cards}
        completedCards={completedCards}
        totalCards={session.cardOrder.length}
      />
    );
  }

  if (!currentCard) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <StudyLayout
      progress={{ current: localIndex, total: session.cardOrder.length }}
      tts={tts}
      actionButton={{
        label: localResults.length > 0 ? "End Session" : "Abandon",
        onClick: () => {
          if (localResults.length > 0) {
            router.push(`/study/${setId}`);
            return;
          }
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
