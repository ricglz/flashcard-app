"use client";

import { useCallback, useMemo, useState } from "react";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";
import {
  editDraftCardField,
  generatedCardsFromPayload,
  toggleDraftCardSelection,
  type GeneratedDraftCard,
} from "@/lib/generatedDraftCards";
import { useGeneratedSetRefinement } from "@/hooks/useGeneratedSetRefinement";

type AppliedDraft = {
  payload: GeneratedSetPayload;
  cards: GeneratedDraftCard[];
};

type UseGeneratedDraftCardsOptions = {
  onError: (message: string | null) => void;
  onCardsChange?: (cards: GeneratedDraftCard[]) => void;
  onPayloadApply?: (draft: AppliedDraft) => void;
};

export function useGeneratedDraftCards({
  onError,
  onCardsChange,
  onPayloadApply,
}: UseGeneratedDraftCardsOptions) {
  const [payload, setPayload] = useState<GeneratedSetPayload | null>(null);
  const [cards, setCards] = useState<GeneratedDraftCard[]>([]);
  const [refinementModel, setRefinementModel] = useState("");

  const applyCards = useCallback(
    (nextCards: GeneratedDraftCard[]) => {
      setCards(nextCards);
      onCardsChange?.(nextCards);
    },
    [onCardsChange],
  );

  const applyPayload = useCallback(
    (nextPayload: GeneratedSetPayload, model: string) => {
      const nextCards = generatedCardsFromPayload(nextPayload);
      setPayload(nextPayload);
      setRefinementModel(model);
      applyCards(nextCards);
      onPayloadApply?.({ payload: nextPayload, cards: nextCards });
      return nextCards;
    },
    [applyCards, onPayloadApply],
  );

  const applyRefinement = useCallback(
    (refinement: AppliedDraft) => {
      setPayload(refinement.payload);
      applyCards(refinement.cards);
      onPayloadApply?.(refinement);
    },
    [applyCards, onPayloadApply],
  );

  const { isRefining, refineDraft } = useGeneratedSetRefinement({
    payload,
    cards,
    cardsFromPayload: generatedCardsFromPayload,
    onApply: applyRefinement,
    onError,
  });

  const selectedCount = useMemo(
    () => cards.filter((card) => card.selected).length,
    [cards],
  );

  const toggleCard = useCallback(
    (index: number) => {
      applyCards(toggleDraftCardSelection(cards, index));
    },
    [applyCards, cards],
  );

  const editCardField = useCallback(
    (index: number, key: string, value: string) => {
      applyCards(editDraftCardField(cards, index, key, value));
    },
    [applyCards, cards],
  );

  const resetDraft = useCallback(() => {
    setPayload(null);
    setRefinementModel("");
    applyCards([]);
  }, [applyCards]);

  return {
    payload,
    cards,
    selectedCount,
    refinementModel,
    setRefinementModel,
    setCards: applyCards,
    applyPayload,
    toggleCard,
    editCardField,
    resetDraft,
    isRefining,
    refineDraft,
  };
}
