"use client";

import { useState } from "react";
import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import StudyCard from "@/components/StudyCard";
import { RouteStateShellWithHeader } from "@/components/ui/RouteStateShell";
import { StateContent } from "@/components/ui/StateContent";
import { LinkButton } from "@/components/ui/LinkButton";
import BrowseNavigation from "@/components/BrowseNavigation";
import AssistantPanel from "@/components/AssistantPanel";
import StudyLayout from "@/components/StudyLayout";
import type { TypedSetWithViewer } from "@/hooks/convex/useTypedFlashcardSet";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardAnnotationsForSetPreloaded } from "@/hooks/useCardAnnotations";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { shuffleArray } from "@/lib/shuffle";

type Flashcards = Extract<
  FunctionReturnType<typeof api.flashcards.list>,
  { ok: true }
>["value"];

// eslint-disable-next-line local/no-large-component-props -- Existing wide component API; reduce before removing this override.
export default function BrowseInner({
  flashcardSetId,
  frontFields,
  backFields,
  ttsOnlyFields,
  shuffle,
  cardLimit,
  setData,
  cards,
  preloadedTtsConfig,
  preloadedAnnotations,
}: {
  flashcardSetId: Id<"flashcardSets">;
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
  shuffle: boolean;
  cardLimit: number | null;
  setData: TypedSetWithViewer;
  cards: Flashcards;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
  preloadedAnnotations: Preloaded<typeof api.cardAnnotations.getForSet>;
}) {
  const setId = String(flashcardSetId);
  const tts = useTtsControls(preloadedTtsConfig);
  const { annotationMap, toggleFlag, setNote } =
    useCardAnnotationsForSetPreloaded(preloadedAnnotations);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const [cardOrder] = useState<Id<"flashcards">[]>(() => {
    const sorted = [...cards]
      .sort((a, b) => a.order - b.order)
      .map((c) => c._id);
    let order = shuffle ? shuffleArray(sorted) : sorted;
    if (cardLimit && cardLimit > 0 && cardLimit < order.length) {
      order = order.slice(0, cardLimit);
    }
    return order;
  });
  const navigation = useCardNavigation({
    orderedIds: cardOrder,
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });

  const { set } = setData;
  const fieldDefs = set.fieldDefinitions;
  const validFieldNames = new Set(fieldDefs.map((fd) => fd.name));
  const validFrontFields = frontFields.filter((f) => validFieldNames.has(f));
  const validBackFields = backFields.filter((f) => validFieldNames.has(f));
  const validTtsOnlyFields = ttsOnlyFields.filter((f) => validFieldNames.has(f));
  const cardsMap = new Map(cards.map((c) => [c._id, c]));

  if (navigation.activeIds.length === 0) {
    return (
      <RouteStateShellWithHeader backLabel="Back">
        <StateContent
          title={
            navigation.hiddenIds.size > 0
              ? "You've reviewed all the cards!"
              : "No cards to browse."
          }
          actions={
            <LinkButton href={`/study/${setId}?mode=browse`} variant="primary" size="md">
              Back to Study Config
            </LinkButton>
          }
        />
      </RouteStateShellWithHeader>
    );
  }

  const safeIndex = navigation.safeIndex;
  const currentCard = navigation.currentId
    ? (cardsMap.get(navigation.currentId) ?? null)
    : null;

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Card not found.</p>
      </div>
    );
  }

  const currentAnnotation = annotationMap.get(currentCard._id);

  return (
    <StudyLayout
      progress={{ current: safeIndex, total: navigation.activeIds.length, dismissed: navigation.hiddenIds.size }}
      tts={tts}
      assistant={
        <AssistantPanel
          context={{
            setId: flashcardSetId,
            cardId: currentCard._id,
            setName: set.name,
            cardFields: currentCard.fields,
            hasNote: Boolean(currentAnnotation?.note?.trim()),
          }}
        />
      }
    >
      <StudyCard
        key={currentCard._id}
        card={currentCard}
        fieldDefinitions={fieldDefs}
        frontFields={validFrontFields}
        backFields={validBackFields}
        ttsOnlyFields={validTtsOnlyFields}
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
        <BrowseNavigation
          onPrev={navigation.goPrevious}
          onNext={navigation.goNext}
          onDismiss={navigation.hideCurrent}
          canPrev={navigation.canPrevious}
          canNext={navigation.canNext}
        />
      )}
    </StudyLayout>
  );
}
