"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import type { WizardAction, WizardState } from "./wizardState";
import type { FieldDefinition } from "@/lib/types";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";

type GeneratedCard = {
  fields: Record<string, string>;
  rationale?: string;
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
      const payload = result.payload as GeneratedSetPayload;
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
    updated[idx] = { ...updated[idx]!, selected: !updated[idx]!.selected };
    setGeneratedCards(updated);
    dispatch({ type: "SET_CARDS", payload: updated.filter((c) => c.selected).map(({ fields }) => fields) });
  };

  const updateCardField = (idx: number, key: string, value: string) => {
    const updated = [...generatedCards];
    updated[idx] = { ...updated[idx]!, fields: { ...updated[idx]!.fields, [key]: value } };
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {selectedCount} of {generatedCards.length} cards selected
            </p>
            <button
              onClick={() => {
                setGeneratedCards([]);
                setError(null);
                dispatch({ type: "SET_CARDS", payload: [] });
              }}
              className="text-sm text-muted hover:text-foreground"
            >
              Regenerate
            </button>
          </div>
          {generatedCards.map((card, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-3 ${card.selected ? "border-edge" : "border-edge opacity-50"}`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={card.selected}
                  onChange={() => toggleCard(idx)}
                  className="mt-1"
                />
                <div className="flex-1 text-sm">
                  {Object.entries(card.fields).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="text-muted">{key}:</span>{" "}
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateCardField(idx, key, e.target.value)}
                        className="border-b border-edge bg-transparent px-1 focus:outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                  {card.rationale && (
                    <p className="text-xs text-muted mt-1 italic">{card.rationale}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
