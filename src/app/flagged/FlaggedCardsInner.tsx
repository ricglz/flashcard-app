"use client";

import type { Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { useTtsControls } from "@/hooks/useTtsControls";
import { useCardNavigation } from "@/hooks/useCardNavigation";
import { useReviewCardState } from "@/hooks/useReviewCardState";
import { RouteStateShellWithHeader } from "@/components/ui/RouteStateShell";
import { StateContent } from "@/components/ui/StateContent";
import { LinkButton } from "@/components/ui/LinkButton";
import FlaggedCardReview from "./FlaggedCardReview";

type FlaggedCardResult = Extract<
  FunctionReturnType<typeof api.cardAnnotations.getFlagged>,
  { ok: true }
>["value"];
export type FlaggedCard = FlaggedCardResult[number];

export default function FlaggedCardsInner({
  flaggedCards: flaggedCardResult,
  preloadedTtsConfig,
}: {
  flaggedCards: FlaggedCardResult;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
}) {
  const tts = useTtsControls(preloadedTtsConfig);
  const { revealed, reveal, resetReveal } = useReviewCardState();

  const navigation = useCardNavigation({
    orderedIds: flaggedCardResult.map((card) => card.cardId),
    initialIndex: 0,
    mode: { kind: "bounded" },
    onCardChange: resetReveal,
  });
  const currentCard = navigation.currentId
    ? (flaggedCardResult.find((card) => card.cardId === navigation.currentId) ?? null)
    : null;

  if (flaggedCardResult.length === 0 && navigation.hiddenIds.size === 0) {
    return (
      <RouteStateShellWithHeader backLabel="Dashboard">
        <StateContent
          title="No flagged cards yet"
          description={
            <>
              Flag cards during study by tapping the &#9733; icon on any card.
              Flagged cards appear here for focused review.
            </>
          }
          actions={
            <LinkButton href="/" variant="primary" size="md">
              Back to Dashboard
            </LinkButton>
          }
        />
      </RouteStateShellWithHeader>
    );
  }

  if (navigation.activeIds.length === 0 && navigation.hiddenIds.size > 0) {
    return (
      <RouteStateShellWithHeader backLabel="Dashboard">
        <StateContent
          title="You've reviewed all flagged cards!"
          description={
            <>
              {navigation.hiddenIds.size} card{navigation.hiddenIds.size !== 1 ? "s" : ""} unflagged
            </>
          }
          actions={
            <LinkButton href="/" variant="primary" size="md">
              Back to Dashboard
            </LinkButton>
          }
        />
      </RouteStateShellWithHeader>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <FlaggedCardReview
      currentCard={currentCard}
      tts={tts}
      progress={{ current: navigation.safeIndex, total: navigation.activeIds.length }}
      review={{ revealed, onReveal: reveal }}
      navigation={{
        canPrevious: navigation.canPrevious,
        canNext: navigation.canNext,
        onPrevious: navigation.goPrevious,
        onNext: navigation.goNext,
        onHideCurrent: navigation.hideCurrent,
      }}
    />
  );
}
