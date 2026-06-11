import type { CardRating } from "@/lib/types";
import type { useTtsControls } from "@/hooks/useTtsControls";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import InlineError from "@/components/InlineError";
import AssistantPanel from "@/components/AssistantPanel";
import SrsReviewActive from "./SrsReviewActive";
import type { SrsReviewScreenState } from "./srsReviewWorkflow";
import type { SrsReviewItem } from "./srsReviewTypes";

export default function SrsReviewActiveScreen({
  screenState,
  currentItem,
  revealed,
  tts,
  onReveal,
  onRate,
}: {
  screenState: Extract<SrsReviewScreenState, { status: "active" }>;
  currentItem: SrsReviewItem;
  revealed: boolean;
  tts: ReturnType<typeof useTtsControls>;
  onReveal: () => void;
  onRate: (rating: CardRating) => void;
}) {
  const router = useRouter();
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);
  const setNote = useMutation(api.cardAnnotations.setNote);
  const currentAnnotation = currentItem.annotation;

  return (
    <>
      <InlineError message={screenState.displayError} />
      <SrsReviewActive
        currentItem={currentItem}
        reviewedCount={screenState.reviewedCount}
        totalCards={screenState.totalCards}
        revealed={revealed}
        isSubmitting={screenState.isSubmittingRating}
        tts={tts}
        onReveal={onReveal}
        onRate={onRate}
        annotation={currentAnnotation ? { flagged: currentAnnotation.flagged, note: currentAnnotation.note } : undefined}
        onToggleFlag={() => {
          void toggleFlag({ cardId: currentItem.card._id, setId: currentItem.setId });
        }}
        onSetNote={(note: string) => {
          void setNote({ cardId: currentItem.card._id, setId: currentItem.setId, note });
        }}
        onEndSession={() => {
          if (confirm("End review session? Your progress is saved.")) {
            router.push("/");
          }
        }}
        assistant={
          <AssistantPanel
            context={{
              setId: currentItem.setId,
              cardId: currentItem.card._id,
              setName: currentItem.setName,
              cardFields: currentItem.card.fields,
              hasNote: Boolean(currentAnnotation?.note?.trim()),
            }}
          />
        }
      />
    </>
  );
}
