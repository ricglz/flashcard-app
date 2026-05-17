"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { FieldDefinition } from "@/lib/types";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";
import GeneratePreview from "@/app/generate/GeneratePreview";
import AiAppendConfig from "./AiAppendConfig";

type Phase = "config" | "generating" | "preview" | "confirming";
type GeneratedCard = GeneratedSetPayload["cards"][number] & { selected: boolean };

type Props = {
  setId: Id<"flashcardSets">;
  fieldDefinitions: FieldDefinition[];
  onClose: () => void;
};

export default function AiAppendFlow({ setId, fieldDefinitions, onClose }: Props) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);
  const confirmAppend = useAction(api.ai.confirmAppendCards);

  const [phase, setPhase] = useState<Phase>("config");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<GeneratedCard[]>([]);

  const handleGenerate = async (config: {
    prompt: string;
    instructions: string;
    targetCount: number;
    model: string;
  }) => {
    if (!config.prompt) return;
    setPhase("generating");
    setError(null);
    try {
      const result = await generateFromPrompt({
        prompt: config.prompt,
        fieldDefinitions: fieldDefinitions.map((fd) => ({
          name: fd.name,
          role: fd.role,
          metadata: { ...fd.metadata },
          order: fd.order,
        })),
        targetCardCount: config.targetCount,
        name: "append",
        ...(config.model ? { model: config.model } : {}),
        addToSrs: false,
        ...(config.instructions ? { instructions: config.instructions } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        setPhase("config");
        return;
      }
      if (!result.validation.ok) {
        setError(`Validation issues: ${result.validation.issues.join(", ")}`);
        setPhase("config");
        return;
      }
      const { cards } = result.payload;
      setCards(
        cards.map((c) => ({
          fields: { ...c.fields },
          rationale: c.rationale,
          selected: true,
        })),
      );
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
      const selectedCards = cards
        .filter((c) => c.selected)
        .map(({ selected: _, sourceCardIds: _s, ...c }) => c);
      const result = await confirmAppend({
        targetSetId: setId,
        fieldDefinitions: fieldDefinitions.map((fd) => ({
          name: fd.name,
          role: fd.role,
          metadata: { ...fd.metadata },
          order: fd.order,
        })),
        cards: selectedCards,
      });
      if (!result.ok) {
        setError(result.error);
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
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-3 border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {phase === "config" && <AiAppendConfig onGenerate={handleGenerate} />}

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
          confirmLabel={`Add to Set (${selectedCount} cards)`}
        />
      )}
    </div>
  );
}
