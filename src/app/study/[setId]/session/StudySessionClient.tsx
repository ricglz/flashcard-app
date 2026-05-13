"use client";

import { isFailureResult } from "@/lib/appResult";
import { useState, useCallback } from "react";
import { usePreloadedQuery, useMutation, Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useOfflineMutation } from "@/lib/useOfflineMutation";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import StudyCard from "@/components/StudyCard";
import CardRatingButtons from "@/components/CardRatingButtons";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";
import { CardRating } from "@/lib/types";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";
import Link from "next/link";

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
  const isOnline = useOnlineStatus();

  const session = usePreloadedQuery(preloadedSession) as ActiveSession;
  const { set } = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const recordResult = useOfflineMutation(api.studySessions.recordResult);
  const abandonSession = useMutation(api.studySessions.abandon);
  const settings = useOfflineQuery(api.userSettings.get);
  const updateSettings = useMutation(api.userSettings.update);
  const annotations = useOfflineQuery(api.cardAnnotations.getForSet, { setId: setId as Id<"flashcardSets"> });
  const toggleFlagMutation = useMutation(api.cardAnnotations.toggleFlag);
  const setNoteMutation = useMutation(api.cardAnnotations.setNote);

  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [localTtsSpeed, setLocalTtsSpeed] = useState<number | null>(null);
  const [localIndexOffset, setLocalIndexOffset] = useState(0);

  const effectiveTtsSpeed = localTtsSpeed ?? settings?.ttsPlaybackSpeed ?? 0.75;

  const annotationMap = new Map(
    (annotations ?? []).map((a) => [a.cardId, { flagged: a.flagged, note: a.note }])
  );

  const handleTtsSpeedChange = useCallback(
    (speed: number) => {
      setLocalTtsSpeed(speed);
      void updateSettings({ ttsPlaybackSpeed: speed });
    },
    [updateSettings]
  );

  const effectiveIndex = session.currentIndex + localIndexOffset;

  // Reset offset when server catches up (after outbox drains)
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

      const isLastCard = effectiveIndex === session.cardOrder.length - 1;

      setIsSubmitting(true);

      if (isLastCard) {
        void recordResult({ sessionId, cardId: currentCardId, rating });
        if (isOnline) {
          router.push(`/study/${setId}/results?sessionId=${sessionId}`);
        }
        return;
      }

      try {
        const result = await recordResult({ sessionId, cardId: currentCardId, rating });
        if (isFailureResult(result)) {
          console.error(result.error.message);
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
    ]
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
            {effectiveIndex + 1} / {session.cardOrder.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TtsSpeedControl speed={effectiveTtsSpeed} onSpeedChange={handleTtsSpeedChange} />
          <button
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
            aria-label={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            <SpeakerIcon muted={!ttsEnabled} />
          </button>
          <button
            onClick={() => {
              if (confirm("Abandon this session?")) {
                void abandonSession({ sessionId });
                router.push(`/study/${setId}`);
              }
            }}
            className="text-sm text-danger hover:text-danger-hover transition-colors"
          >
            Abandon
          </button>
        </div>
      </header>

      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(effectiveIndex / session.cardOrder.length) * 100}%`,
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
          ttsOnlyFields={session.ttsOnlyFields ?? []}
          onRevealed={() => setRevealed(true)}
          autoPlayTts={ttsEnabled}
          ttsRate={effectiveTtsSpeed}
          annotation={currentCardId ? annotationMap.get(currentCardId) : undefined}
          onToggleFlag={() => {
            if (currentCardId) void toggleFlagMutation({ cardId: currentCardId, setId: setId as Id<"flashcardSets"> });
          }}
          onSetNote={(note: string) => {
            if (currentCardId) void setNoteMutation({ cardId: currentCardId, setId: setId as Id<"flashcardSets">, note });
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
      </main>
    </div>
  );
}
