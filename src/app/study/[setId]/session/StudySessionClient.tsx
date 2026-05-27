"use client";


import { useState, useCallback, useMemo } from "react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import AssistantPanel from "@/components/AssistantPanel";
import StudyLayout from "@/components/StudyLayout";
import type { CardRating, ActiveStudySession } from "@/lib/types";
import {
  type FlashcardSetWithViewer,
  useTypedFlashcardSet,
} from "@/hooks/convex/useTypedFlashcardSet";
import SetAccessError from "@/components/SetAccessError";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsForSetPreloaded } from "@/hooks/useCardAnnotations";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import InlineError from "@/components/InlineError";
import StudySessionLocalResults, {
  type LocalStudyResult,
} from "./StudySessionLocalResults";

const EMPTY_CARDS: Doc<"flashcards">[] = [];

type Props = {
  flashcardSetId: Id<"flashcardSets">;
  sessionId: Id<"studySessions">;
  initialSession: ActiveStudySession;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  initialSet: FlashcardSetWithViewer;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getForSet>;
};

export default function StudySessionClient({
  flashcardSetId,
  sessionId,
  initialSession,
  preloadedSet,
  initialSet,
  preloadedCards,
  preloadedTtsConfig,
  preloadedAnnotations,
}: Props) {
  const router = useRouter();
  const setId = String(flashcardSetId);

  const session = initialSession;
  const setResult = useTypedFlashcardSet(preloadedSet, initialSet);
  const cardsResult = usePreloadedQuery(preloadedCards);
  const cards = cardsResult.ok ? cardsResult.value : EMPTY_CARDS;
  const recordResult = useOfflineMutation(api.studySessions.recordResult, {
    strategy: "queue-first",
  });
  const abandonSession = useMutation(api.studySessions.abandon);
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } = useCardAnnotationsForSetPreloaded(preloadedAnnotations);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localResults, setLocalResults] = useState<LocalStudyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigation = useCardNavigation({
    orderedIds: session.cardOrder,
    initialIndex: session.currentIndex,
    mode: { kind: "session", serverIndex: session.currentIndex },
    onCardChange: resetReveal,
  });

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (isSubmitting) return;
      const currentCardId = navigation.currentId;
      if (!currentCardId) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await recordResult({ sessionId, cardId: currentCardId, rating });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setLocalResults((previous) => [...previous, { cardId: currentCardId, rating }]);
        navigation.advance();
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      sessionId,
      isSubmitting,
      navigation,
      recordResult,
    ],
  );

  const cardsMap = useMemo(() => new Map(cards.map((c) => [c._id, c])), [cards]);
  const currentCardId = navigation.currentId;
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;
  const sessionComplete = navigation.isPastEnd;
  const completedCards = Math.min(
    session.cardOrder.length,
    Math.max(navigation.currentIndex, session.currentIndex),
  );

  if (!setResult.ok) {
    return <SetAccessError message={setResult.error.message} href={`/study/${setId}`} label="Back to study" />;
  }
  if (!cardsResult.ok) return null;

  const { set } = setResult.value;
  const fieldDefs = set.fieldDefinitions;

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

  const currentAnnotation = annotationMap.get(currentCard._id);

  return (
    <StudyLayout
      progress={{ current: navigation.currentIndex, total: session.cardOrder.length }}
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
            cardId: currentCard._id,
            setName: set.name,
            cardFields: currentCard.fields,
            hasNote: Boolean(currentAnnotation?.note?.trim()),
          }}
        />
      }
    >
      <InlineError message={error} />
      <StudyCard
        key={currentCardId}
        card={currentCard}
        fieldDefinitions={fieldDefs}
        frontFields={session.frontFields}
        backFields={session.backFields}
        ttsOnlyFields={session.ttsOnlyFields}
        onRevealed={reveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={currentAnnotation}
        onToggleFlag={() => {
          if (currentCardId) void toggleFlag({ cardId: currentCardId, setId: flashcardSetId });
        }}
        onSetNote={(note: string) => {
          if (currentCardId) void setNote({ cardId: currentCardId, setId: flashcardSetId, note });
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
