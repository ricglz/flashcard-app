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
import { includedCardFields } from "@/lib/generatedDraftCards";
import { useGeneratedDraftCards } from "@/hooks/useGeneratedDraftCards";
import type { WizardAction, WizardState } from "./wizardState";
import type { FieldDefinition } from "@/lib/types";

export default function AiPath({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);

  const [aiConfig, setAiConfig] = useState<AiGenerationConfigValue>({
    prompt: "",
    instructions: "",
    targetCount: 20,
    model: "",
  });
  const [localFieldDefs, setLocalFieldDefs] = useState<FieldDefinition[]>(state.fieldDefinitions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    cards: generatedCards,
    selectedCount,
    refinementModel,
    setRefinementModel,
    applyPayload,
    toggleCard,
    editCardField,
    resetDraft,
    isRefining,
    refineDraft,
  } = useGeneratedDraftCards({
    onError: setError,
    onCardsChange: (cards) => {
      dispatch({ type: "SET_CARDS", payload: includedCardFields(cards) });
    },
    onPayloadApply: (draft) => {
      dispatch({
        type: "SET_FIELD_DEFINITIONS",
        payload: [...draft.payload.fieldDefinitions],
      });
    },
  });

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
      applyPayload(result.value.payload, aiConfig.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleCard = (idx: number) => {
    if (isRefining) return;
    toggleCard(idx);
  };

  const updateCardField = (idx: number, key: string, value: string) => {
    if (isRefining) return;
    editCardField(idx, key, value);
  };

  const resetGeneratedCards = () => {
    if (isRefining) return;
    resetDraft();
    setError(null);
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
            <div className="flex flex-col items-center py-4 gap-2">
              <div className="animate-spin h-6 w-6 border-4 border-accent border-t-transparent rounded-full" />
              <p className="text-muted text-xs">This may take 10-30 seconds.</p>
            </div>
          )}
        </>
      )}

      {hasGenerated && (
        <AiCardPreview
          cards={generatedCards}
          selectedCount={selectedCount}
          onToggle={handleToggleCard}
          onEdit={updateCardField}
          onRegenerate={resetGeneratedCards}
          onRefine={refineDraft}
          refinementModel={refinementModel}
          onRefinementModelChange={setRefinementModel}
          locked={isRefining}
        />
      )}
    </div>
  );
}
