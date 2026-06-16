"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { FieldDefinition } from "@/lib/types";
import { selectedCardsForAppend } from "@/lib/generatedDraftCards";
import { useGeneratedDraftCards } from "@/hooks/useGeneratedDraftCards";
import GeneratePreviewActions from "@/app/generate/GeneratePreviewActions";
import AiAppendConfig, { type AiAppendConfigValue } from "./AiAppendConfig";
import AiErrorMessage from "@/components/AiErrorMessage";
import AiRefinementPanel from "@/components/AiRefinementPanel";
import CardPreviewList from "@/components/CardPreviewList";
import { Spinner } from "@/components/ui/Spinner";

type Phase = "config" | "generating" | "preview" | "confirming";

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

export default function AiAppendFlow({ setId, fieldDefinitions, onClose }: Props) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);
  const confirmAppend = useAction(api.ai.confirmAppendCards);

  const [phase, setPhase] = useState<Phase>("config");
  const [config, setConfig] = useState<AiAppendConfigValue>({
    prompt: "",
    instructions: "",
    targetCount: 10,
    model: "",
  });
  const [error, setError] = useState<string | null>(null);
  const {
    cards,
    selectedCount,
    refinementModel,
    setRefinementModel,
    applyPayload,
    toggleCard,
    editCardField,
    isRefining,
    refineDraft,
  } = useGeneratedDraftCards({
    onError: setError,
  });

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
      applyPayload(result.value.payload, config.model);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("config");
    }
  };

  const handleConfirm = async () => {
    setPhase("confirming");
    setError(null);
    try {
      const result = await confirmAppend({
        targetSetId: setId,
        fieldDefinitions: fieldDefinitionsForAction(fieldDefinitions),
        cards: selectedCardsForAppend(cards),
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
        <div className="flex flex-col items-center py-8">
          <Spinner
            size="lg"
            label={
              phase === "generating"
                ? "Generating cards... this may take 10-30 seconds."
                : "Adding cards to set..."
            }
          />
        </div>
      )}

      {phase === "preview" && (
        <div className="space-y-4">
          <GeneratePreviewActions
            selectedCount={selectedCount}
            totalCount={cards.length}
            onBack={() => setPhase("config")}
            onConfirm={handleConfirm}
            locked={isRefining}
            confirmAction="Add to Set"
          />
          <AiRefinementPanel
            cards={cards}
            onRefine={refineDraft}
            refinementModel={refinementModel}
            onRefinementModelChange={setRefinementModel}
            pending={isRefining}
          />
          <CardPreviewList
            cards={cards}
            onToggle={toggleCard}
            onEdit={editCardField}
            disabled={isRefining}
          />
        </div>
      )}
    </div>
  );
}
