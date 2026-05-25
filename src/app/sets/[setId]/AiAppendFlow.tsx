"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { FieldDefinition } from "@/lib/types";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";
import { cloneGeneratedSetForAction, mergeRefinedPayloadCards } from "@/lib/generatedSetDraft";
import {
  getCardsForRefinement,
  type RefinementRequest,
} from "@/lib/refinementScope";
import GeneratePreview from "@/app/generate/GeneratePreview";
import AiAppendConfig, { type AiAppendConfigValue } from "./AiAppendConfig";
import AiErrorMessage from "@/components/AiErrorMessage";

type Phase = "config" | "generating" | "preview" | "confirming";
type GeneratedCard = GeneratedSetPayload["cards"][number] & { selected: boolean };

type Props = {
  setId: Id<"flashcardSets">;
  fieldDefinitions: FieldDefinition[];
  onClose: () => void;
};

function fieldDefinitionsForAction(fieldDefinitions: readonly FieldDefinition[]) {
  return fieldDefinitions.map((fd) => ({
    name: fd.name,
    role: fd.role,
    metadata: { ...fd.metadata },
    order: fd.order,
  }));
}

function cardsForAppend(cards: readonly GeneratedCard[]) {
  return cards
    .filter((c) => c.selected)
    .map((card) => ({
      fields: { ...card.fields },
      rationale: card.rationale,
    }));
}

export default function AiAppendFlow({ setId, fieldDefinitions, onClose }: Props) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);
  const refineGeneratedSet = useAction(api.ai.refineGeneratedSet);
  const confirmAppend = useAction(api.ai.confirmAppendCards);

  const [phase, setPhase] = useState<Phase>("config");
  const [isRefining, setIsRefining] = useState(false);
  const [config, setConfig] = useState<AiAppendConfigValue>({
    prompt: "",
    instructions: "",
    targetCount: 10,
    model: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [payload, setPayload] = useState<GeneratedSetPayload | null>(null);
  const [refinementModel, setRefinementModel] = useState("");

  function cardsFromPayload(nextPayload: GeneratedSetPayload): GeneratedCard[] {
    return nextPayload.cards.map((c) => ({
      fields: { ...c.fields },
      sourceCardIds: c.sourceCardIds ? [...c.sourceCardIds] : undefined,
      rationale: c.rationale,
      selected: true,
    }));
  }

  const handleGenerate = async (config: AiAppendConfigValue) => {
    if (!config.prompt) return;
    setPhase("generating");
    setError(null);
    try {
      const result = await generateFromPrompt({
        prompt: config.prompt,
        fieldDefinitions: fieldDefinitionsForAction(fieldDefinitions),
        targetCardCount: config.targetCount,
        name: "append",
        ...(config.model ? { model: config.model } : {}),
        addToSrs: false,
        ...(config.instructions ? { instructions: config.instructions } : {}),
      });
      if (!result.ok) {
        setError(result.error.message);
        setPhase("config");
        return;
      }
      if (!result.value.validation.ok) {
        setError(`Validation issues: ${result.value.validation.issues.join(", ")}`);
        setPhase("config");
        return;
      }
      setPayload(result.value.payload);
      setCards(cardsFromPayload(result.value.payload));
      setRefinementModel(config.model);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("config");
    }
  };

  const handleRefine = async ({ instructions, model, scope }: RefinementRequest) => {
    if (!payload) return false;
    const cardsToRefine = getCardsForRefinement(cards, scope);
    const draft = cloneGeneratedSetForAction(payload, cardsToRefine);
    setIsRefining(true);
    setError(null);
    try {
      const result = await refineGeneratedSet({
        draft,
        instructions,
        ...(model ? { model } : {}),
      });
      if (!result.ok) {
        setError(result.error.message);
        return false;
      }
      if (!result.value.validation.ok) {
        setError(`Validation issues: ${result.value.validation.issues.join(", ")}`);
        return false;
      }
      const mergeResult = mergeRefinedPayloadCards(
        cards,
        result.value.payload,
        scope,
        cardsFromPayload,
      );
      if (!mergeResult.ok) {
        setError(mergeResult.message);
        return false;
      }
      setPayload(mergeResult.payload);
      setCards(mergeResult.cards);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
      return false;
    } finally {
      setIsRefining(false);
    }
  };

  const handleConfirm = async () => {
    setPhase("confirming");
    setError(null);
    try {
      const result = await confirmAppend({
        targetSetId: setId,
        fieldDefinitions: fieldDefinitionsForAction(fieldDefinitions),
        cards: cardsForAppend(cards),
      });
      if (!result.ok) {
        setError(result.error.message);
        setPhase("preview");
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add cards");
      setPhase("preview");
    }
  };

  const selectedCount = cards.filter((c) => c.selected).length;

  return (
    <div className="border border-edge rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Generate Cards</h3>
        <button
          onClick={onClose}
          disabled={isRefining}
          className="text-sm text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>

      <AiErrorMessage message={error} />

      {phase === "config" && (
        <AiAppendConfig
          value={config}
          onChange={setConfig}
          onGenerate={handleGenerate}
        />
      )}

      {(phase === "generating" || phase === "confirming") && (
        <div className="flex flex-col items-center py-8 gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          <p className="text-muted text-sm">
            {phase === "generating"
              ? "Generating cards... this may take 10-30 seconds."
              : "Adding cards to set..."}
          </p>
        </div>
      )}

      {phase === "preview" && (
        <GeneratePreview
          cards={cards}
          selectedCount={selectedCount}
          onCardsChange={setCards}
          onBack={() => setPhase("config")}
          onConfirm={handleConfirm}
          onRefine={handleRefine}
          refinementModel={refinementModel}
          onRefinementModelChange={setRefinementModel}
          isRefining={isRefining}
          confirmLabel={`Add to Set (${selectedCount} cards)`}
        />
      )}
    </div>
  );
}
