"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { FieldDefinition } from "@/lib/types";
import GeneratePreview from "@/app/generate/GeneratePreview";

type Phase = "config" | "generating" | "preview" | "confirming";
type GeneratedCard = {
  fields: Record<string, string>;
  sourceCardIds?: string[];
  rationale?: string;
  selected: boolean;
};

type Props = {
  setId: Id<"flashcardSets">;
  fieldDefinitions: FieldDefinition[];
  onClose: () => void;
};

export default function AiAppendFlow({ setId, fieldDefinitions, onClose }: Props) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);
  const confirmAppend = useAction(api.ai.confirmAppendCards);

  const [phase, setPhase] = useState<Phase>("config");
  const [prompt, setPrompt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [targetCount, setTargetCount] = useState(10);
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<GeneratedCard[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setPhase("generating");
    setError(null);
    try {
      const result = await generateFromPrompt({
        prompt: prompt.trim(),
        fieldDefinitions: fieldDefinitions.map((fd) => ({
          name: fd.name,
          role: fd.role,
          metadata: { ...fd.metadata },
          order: fd.order,
        })),
        targetCardCount: targetCount,
        name: "append",
        ...(model ? { model } : {}),
        addToSrs: false,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
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
        cards.map((c) => ({          fields: { ...c.fields },
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

      {phase === "config" && (
        <div className="space-y-3">
          <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium mb-1">
              Prompt
            </label>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe the cards you want to generate..."
              className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
            />
          </div>
          <div>
            <label htmlFor="ai-instructions" className="block text-sm font-medium mb-1">
              Additional instructions (optional)
            </label>
            <textarea
              id="ai-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Any specific guidelines for card format, difficulty, etc."
              className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="ai-count" className="block text-sm font-medium mb-1">
                Target count
              </label>
              <input
                id="ai-count"
                type="number"
                min={1}
                max={50}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value) || 10)}
                className="w-24 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
              />
            </div>
            <div>
              <label htmlFor="ai-model" className="block text-sm font-medium mb-1">
                Model (optional)
              </label>
              <input
                id="ai-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Default"
                className="w-40 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50"
          >
            Generate
          </button>
        </div>
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
          confirmLabel={`Add to Set (${selectedCount} cards)`}
        />
      )}
    </div>
  );
}
