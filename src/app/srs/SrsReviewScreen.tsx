import type { CardRating } from "@/lib/types";
import type { useTtsControls } from "@/hooks/useTtsControls";
import type { SrsReviewItem } from "./srsReviewTypes";
import type { SrsReviewScreenState } from "./srsReviewWorkflow";
import SrsReviewActiveScreen from "./SrsReviewActiveScreen";
import SrsReviewCompleteScreen from "./SrsReviewCompleteScreen";
import SrsReviewReconnectingScreen from "./SrsReviewReconnectingScreen";

type SrsReviewScreenProps = {
  screenState: SrsReviewScreenState;
  currentItem: SrsReviewItem | null;
  revealed: boolean;
  tts: ReturnType<typeof useTtsControls>;
  onReveal: () => void;
  onRate: (rating: CardRating) => void;
  onLoadMore: () => void;
};

export default function SrsReviewScreen(props: SrsReviewScreenProps) {
  switch (props.screenState.status) {
    case "complete":
      return (
        <SrsReviewCompleteScreen
          screenState={props.screenState}
          onLoadMore={props.onLoadMore}
        />
      );
    case "reconnecting":
      return (
        <SrsReviewReconnectingScreen
          displayError={props.screenState.displayError}
        />
      );
    case "active":
      if (!props.currentItem) {
        return (
          <SrsReviewReconnectingScreen
            displayError={props.screenState.displayError}
          />
        );
      }
      return (
        <SrsReviewActiveScreen
          screenState={props.screenState}
          currentItem={props.currentItem}
          revealed={props.revealed}
          tts={props.tts}
          onReveal={props.onReveal}
          onRate={props.onRate}
        />
      );
  }
}
