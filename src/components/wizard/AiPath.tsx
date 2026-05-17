"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import AiCardPreview from "./AiCardPreview";
import type { WizardAction, WizardState } from "./wizardState";
import type { FieldDefinition } from "@/lib/types";

import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";

type GeneratedCard = Pick<GeneratedSetPayload["cards"][number], "fields" | "rationale"> & {
  selected: boolean;
};

export default function AiPath({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const generateFromPrompt = useAction(api.ai.generateFromPrompt);

  const [prompt, setPrompt] = useState("");
  const [targetCount, setTargetCount] = useState(20);
  const [model, setModel] = useState("");
  const [instructions, setInstructions] = useState("");
  const [localFieldDefs, setLocalFieldDefs] = useState<FieldDefinition[]>(state.fieldDefinitions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);

  const hasGenerated = generatedCards.length > 0;

  const handleGenerate = async () => {
    if (!prompt.trim() || localFieldDefs.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateFromPrompt({
        prompt: prompt.trim(),
        fieldDefinitions: localFieldDefs,
        targetCardCount: targetCount,
        name: state.name || "AI Generated Set",
        ...(model ? { model } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        addToSrs: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.validation.ok) {
        setError(`Validation issues: ${result.validation.issues.join(", ")}`);
        return;
      }
      const payload = result.payload;
      const cards = payload.cards.map((c) => ({
        fields: { ...c.fields },
        rationale: c.rationale,
        selected: true,
      }));
      setGeneratedCards(cards);
      dispatch({ type: "SET_FIELD_DEFINITIONS", payload: payload.fieldDefinitions as FieldDefinition[] });
      dispatch({ type: "SET_CARDS", payload: cards.filter((c) => c.selected).map(({ fields }) => fields) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCard = (idx: number) => {
    const updated = [...generatedCards];
    const card = updated[idx];
    if (!card) return;
    updated[idx] = { ...card, selected: !card.selected };
    setGeneratedCards(updated);
    dispatch({ type: "SET_CARDS", payload: updated.filter((c) => c.selected).map(({ fields }) => fields) });
  };

  const updateCardField = (idx: number, key: string, value: string) => {
    const updated = [...generatedCards];
    const card = updated[idx];
    if (!card) return;
    updated[idx] = { ...card, fields: { ...card.fields, [key]: value } };
    setGeneratedCards(updated);
    dispatch({ type: "SET_CARDS", payload: updated.filter((c) => c.selected).map(({ fields }) => fields) });
  };

  const selectedCount = generatedCards.filter((c) => c.selected).length;

  return (
    <div className="space-y-4">
      {!hasGenerated && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder='e.g., "Generate 20 basic Mandarin greetings" or "Common Japanese food vocabulary"'
              className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Card Count</label>
              <input
                type="number"
                min={1}
                max={100}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model (optional)</label>
              <input
                type="text"
                placeholder="Use default for provider"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Additional Instructions (optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder='e.g., "Include example sentences" or "Use simplified Chinese only"'
              className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
            />
          </div>

          {error && (
            <div className="p-3 border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !prompt.trim() || localFieldDefs.length === 0}
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
          onToggle={toggleCard}
          onEdit={updateCardField}
          onRegenerate={() => {
            setGeneratedCards([]);
            setError(null);
            dispatch({ type: "SET_CARDS", payload: [] });
          }}
        />
      )}
    </div>
  );
}
