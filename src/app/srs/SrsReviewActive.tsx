import type { ReactNode } from "react";
import StudyCard from "@/components/StudyCard";
import StudyLayout from "@/components/StudyLayout";
import type { useTtsControls } from "@/hooks/useTtsControls";
import type { SrsReviewItem } from "./srsReviewTypes";

export default function SrsReviewActive({
  currentItem,
  reviewedCount,
  totalCards,
  tts,
  onReveal,
  onEndSession,
  annotation,
  onToggleFlag,
  onSetNote,
  reviewControls,
  assistant,
}: {
  currentItem: SrsReviewItem;
  reviewedCount: number;
  totalCards: number;
  tts: ReturnType<typeof useTtsControls>;
  onReveal: () => void;
  onEndSession: () => void;
  annotation?: { flagged: boolean; note?: string };
  onToggleFlag?: () => void;
  onSetNote?: (note: string) => void;
  reviewControls?: ReactNode;
  assistant?: ReactNode;
}) {
  return (
    <StudyLayout
      progress={{ current: reviewedCount, total: totalCards }}
      tts={tts}
      actionButton={{ label: "End Session", onClick: onEndSession }}
      assistant={assistant}
    >
      <StudyCard
        key={currentItem._id}
        card={currentItem.card}
        fieldDefinitions={currentItem.fieldDefinitions}
        frontFields={currentItem.frontFields}
        backFields={currentItem.backFields}
        ttsOnlyFields={currentItem.ttsOnlyFields}
        onRevealed={onReveal}
        autoPlayTts={tts.ttsEnabled}
        ttsRate={tts.speed}
        annotation={annotation}
        onToggleFlag={onToggleFlag}
        onSetNote={onSetNote}
      />

      {reviewControls}
    </StudyLayout>
  );
}
