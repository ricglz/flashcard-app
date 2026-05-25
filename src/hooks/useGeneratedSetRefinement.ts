"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";
import {
  cloneScopedGeneratedSetForAction,
  type DraftCard,
  resolveRefinedPayload,
} from "@/lib/generatedSetDraft";
import type { RefinementRequest, RefinementResult } from "@/lib/refinementScope";

type SelectableDraftCard = DraftCard & { selected: boolean };

type AppliedRefinement<T extends SelectableDraftCard> = {
  payload: GeneratedSetPayload;
  cards: T[];
};

type UseGeneratedSetRefinementOptions<T extends SelectableDraftCard> = {
  payload: GeneratedSetPayload | null;
  cards: readonly T[];
  cardsFromPayload: (payload: GeneratedSetPayload) => T[];
  onApply: (refinement: AppliedRefinement<T>) => void;
  onError: (message: string | null) => void;
};

export function useGeneratedSetRefinement<T extends SelectableDraftCard>({
  payload,
  cards,
  cardsFromPayload,
  onApply,
  onError,
}: UseGeneratedSetRefinementOptions<T>) {
  const refineGeneratedSet = useAction(api.ai.refineGeneratedSet);
  const [isRefining, setIsRefining] = useState(false);

  const refineDraft = async ({
    instructions,
    model,
    scope,
  }: RefinementRequest): Promise<RefinementResult> => {
    if (!payload) return { kind: "not_applied", reason: "missing_draft" };

    setIsRefining(true);
    onError(null);
    try {
      const result = await refineGeneratedSet({
        draft: cloneScopedGeneratedSetForAction(payload, cards, scope),
        instructions,
        ...(model ? { model } : {}),
      });
      const refinement = resolveRefinedPayload(result, cards, scope, cardsFromPayload);
      if (refinement.kind === "not_applied") {
        onError(refinement.message);
        return refinement;
      }
      onApply({ payload: refinement.payload, cards: refinement.cards });
      return { kind: "applied" };
    } catch (err) {
      onError(err instanceof Error ? err.message : "Refinement failed");
      return { kind: "not_applied", reason: "unexpected_error" };
    } finally {
      setIsRefining(false);
    }
  };

  return { isRefining, refineDraft };
}
