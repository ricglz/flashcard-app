"use client";

import { useState, useCallback, useMemo } from "react";
import type { Preloaded } from "convex/react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../convex/_generated/api";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useRouter } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import AssistantPanel from "@/components/AssistantPanel";
import StudyLayout from "@/components/StudyLayout";
import type { CardRating, ActiveStudySession } from "@/lib/types";
import type { TypedSetWithViewer } from "@/hooks/convex/useTypedFlashcardSet";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsForSetPreloaded } from "@/hooks/useCardAnnotations";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import InlineError from "@/components/InlineError";
import type { LlmModel } from "@/lib/aiModels";
import StudySessionLocalResults, {
  type LocalStudyResult,
} from "./StudySessionLocalResults";
import { Spinner } from "@/components/ui/Spinner";

type Flashcards = Extract<
  FunctionReturnType<typeof api.flashcards.list>,
  { ok: true }
>["value"];

export default function StudySessionInner({
  session,
  setData,
  cards,
  preloadedTtsConfig,
  preloadedAnnotations,
  initialAssistantModels,
}: {
  session: ActiveStudySession;
  setData: TypedSetWithViewer;
  cards: Flashcards;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getForSet>;
  initialAssistantModels?: readonly LlmModel[];
}) {
  const router = useRouter();
  const flashcardSetId = session.setId;
  const sessionId = session._id;
  const setId = String(flashcardSetId);
  const recordResult = useOfflineMutation(api.studySessions.recordResult, {
    strategy: "queue-first",
  });
  const abandonSession = useMutation(api.studySessions.abandon);
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } =
    useCardAnnotationsForSetPreloaded(preloadedAnnotations);
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
  const currentCard = navigation.currentId
    ? (cardsMap.get(navigation.currentId) ?? null)
    : null;
  const sessionComplete = navigation.isPastEnd;
  const completedCards = Math.min(
    session.cardOrder.length,
    Math.max(navigation.currentIndex, session.currentIndex),
  );

  const { set } = setData;
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
        <Spinner size="lg" />
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
          initialModels={initialAssistantModels}
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
        key={currentCard._id}
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
          void toggleFlag({ cardId: currentCard._id, setId: flashcardSetId });
        }}
        onSetNote={(note: string) => {
          void setNote({ cardId: currentCard._id, setId: flashcardSetId, note });
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
