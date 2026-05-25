"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import AiGenerationConfig, {
  type AiGenerationConfigValue,
} from "@/components/AiGenerationConfig";
import AiCardPreview from "./AiCardPreview";
import AiErrorMessage from "@/components/AiErrorMessage";
import { cloneGeneratedSetForAction, mergeRefinedPayloadCards } from "@/lib/generatedSetDraft";
import {
  getCardsForRefinement,
  type RefinementRequest,
} from "@/lib/refinementScope";
import type { WizardAction, WizardState } from "./wizardState";
import type { FieldDefinition } from "@/lib/types";

import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";

type GeneratedCard = Pick<GeneratedSetPayload["cards"][number], "fields" | "rationale"> & {
  selected: boolean;
};

function wizardCardsFromPayload(payload: GeneratedSetPayload): GeneratedCard[] {
  return payload.cards.map((c) => ({
    fields: { ...c.fields },
    rationale: c.rationale,
    selected: true,
  }));
}

function includedCardFields(cards: readonly GeneratedCard[]) {
  return cards.filter((c) => c.selected).map(({ fields }) => fields);
}

const GENERATING_INDICATOR = (
  <div className="flex flex-col items-center py-4 gap-2">
    <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" />
    <p className="text-muted text-xs">This may take 10-30 seconds.</p>
  </div>
);

export default function AiPath({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);
  const refineGeneratedSet = useAction(api.ai.refineGeneratedSet);

  const [aiConfig, setAiConfig] = useState<AiGenerationConfigValue>({ prompt: "", instructions: "", targetCount: 20, model: "" });
  const [localFieldDefs, setLocalFieldDefs] = useState<FieldDefinition[]>(state.fieldDefinitions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [generatedPayload, setGeneratedPayload] = useState<GeneratedSetPayload | null>(null);
  const [refinementModel, setRefinementModel] = useState("");

  const hasGenerated = generatedCards.length > 0;

  const handleGenerate = async () => {
    const prompt = aiConfig.prompt.trim();
    const instructions = aiConfig.instructions.trim();
    if (!prompt || localFieldDefs.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateFromPrompt({
        prompt,
        fieldDefinitions: localFieldDefs,
        targetCardCount: aiConfig.targetCount,
        name: state.name || "AI Generated Set",
        ...(aiConfig.model ? { model: aiConfig.model } : {}),
        ...(instructions ? { instructions } : {}),
        addToSrs: true,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (!result.value.validation.ok) {
        setError(`Validation issues: ${result.value.validation.issues.join(", ")}`);
        return;
      }
      const payload = result.value.payload;
      const cards = wizardCardsFromPayload(payload);
      setGeneratedPayload(payload);
      setGeneratedCards(cards);
      setRefinementModel(aiConfig.model);
      dispatch({ type: "SET_FIELD_DEFINITIONS", payload: [...payload.fieldDefinitions] });
      dispatch({ type: "SET_CARDS", payload: includedCardFields(cards) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async ({ instructions, model, scope }: RefinementRequest) => {
    if (!generatedPayload) return false;
    setIsRefining(true);
    setError(null);
    try {
      const cardsToRefine = getCardsForRefinement(generatedCards, scope);
      const draft = cloneGeneratedSetForAction(generatedPayload, cardsToRefine);
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
        generatedCards,
        result.value.payload,
        scope,
        wizardCardsFromPayload,
      );
      if (!mergeResult.ok) {
        setError(mergeResult.message);
        return false;
      }
      setGeneratedPayload(mergeResult.payload);
      setGeneratedCards(mergeResult.cards);
      dispatch({ type: "SET_FIELD_DEFINITIONS", payload: [...result.value.payload.fieldDefinitions] });
      dispatch({ type: "SET_CARDS", payload: includedCardFields(mergeResult.cards) });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
      return false;
    } finally {
      setIsRefining(false);
    }
  };

  const toggleCard = (idx: number) => {
    if (isRefining) return;
    const updated = [...generatedCards];
    const card = updated[idx];
    if (!card) return;
    updated[idx] = { ...card, selected: !card.selected };
    setGeneratedCards(updated);
    dispatch({ type: "SET_CARDS", payload: includedCardFields(updated) });
  };

  const updateCardField = (idx: number, key: string, value: string) => {
    if (isRefining) return;
    const updated = [...generatedCards];
    const card = updated[idx];
    if (!card) return;
    updated[idx] = { ...card, fields: { ...card.fields, [key]: value } };
    setGeneratedCards(updated);
    dispatch({ type: "SET_CARDS", payload: includedCardFields(updated) });
  };

  return (
    <div className="space-y-4">
      {!hasGenerated && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Field Definitions</label>
            <p className="text-xs text-muted mb-2">
              Define the fields each card should have. Select a preset in Step 1 to pre-fill.
            </p>
            <FieldDefinitionEditor
              value={localFieldDefs}
              onChange={setLocalFieldDefs}
            />
          </div>

          <AiGenerationConfig
            value={aiConfig}
            onChange={setAiConfig}
            promptPlaceholder='e.g., "Generate 20 basic Mandarin greetings" or "Common Japanese food vocabulary"'
            instructionsPlaceholder='e.g., "Include example sentences" or "Use simplified Chinese only"'
            countLabel="Card Count"
            modelLabel="Model (optional)"
            modelDefaultLabel="Use default for provider"
          />

          <AiErrorMessage message={error} />

          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !aiConfig.prompt.trim() || localFieldDefs.length === 0}
            className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Cards"}
          </button>

          {isGenerating && (
            GENERATING_INDICATOR
          )}
        </>
      )}

      {hasGenerated && (
        <AiCardPreview
          cards={generatedCards}
          selectedCount={generatedCards.filter((c) => c.selected).length}
          onToggle={toggleCard}
          onEdit={updateCardField}
          onRegenerate={() => {
            if (isRefining) return;
            setGeneratedCards([]);
            setGeneratedPayload(null);
            setError(null);
            dispatch({ type: "SET_CARDS", payload: [] });
          }}
          onRefine={handleRefine}
          refinementModel={refinementModel}
          onRefinementModelChange={setRefinementModel}
          isRefining={isRefining}
          disabled={isRefining}
        />
      )}
    </div>
  );
}
