"use client";

import { useState, useMemo } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Methodology = "balanced" | "recent_lapses" | "low_ease" | "learning_stuck";
type Step = "config" | "loading" | "preview" | "done";

type GeneratedCard = {
  fields: Record<string, string>;
  sourceCardIds?: string[];
  rationale?: string;
  selected: boolean;
};

export default function GenerateClient() {
  const router = useRouter();
  const userSets = useOfflineQuery(api.flashcardSets.list);
  const generateCards = useAction(api.ai.generateRemedialCards);
  const confirmSet = useAction(api.ai.confirmGeneratedSet);

  const srsEnabledSets = useMemo(
    () => userSets?.filter((s) => s.userSet.srsEnabled) ?? [],
    [userSets]
  );

  const [step, setStep] = useState<Step>("config");
  const [methodology, setMethodology] = useState<Methodology>("balanced");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [targetCount, setTargetCount] = useState(20);
  const [setName, setSetName] = useState("Remedial Cards");
  const [model, setModel] = useState("");
  const [addToSrs, setAddToSrs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [payload, setPayload] = useState<any>(null);

  const handleGenerate = async () => {
    setStep("loading");
    setError(null);
    try {
      const result = await generateCards({
        methodology,
        ...(selectedSetId ? { setId: selectedSetId as any } : {}),
        targetCardCount: targetCount,
        name: setName,
        ...(model ? { model } : {}),
        addToSrs,
      });
      if (!result.ok) {
        setError(result.error);
        setStep("config");
        return;
      }
      if (!result.validation.ok) {
        setError(`Validation issues: ${result.validation.issues.join(", ")}`);
        setStep("config");
        return;
      }
      setPayload(result.payload);
      setCards(
        (result.payload.cards as any[]).map((c: any) => ({ ...c, selected: true }))
      );
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("config");
    }
  };

  const handleConfirm = async () => {
    if (!payload) return;
    setStep("loading");
    setError(null);
    try {
      const selectedCards = cards
        .filter((c) => c.selected)
        .map(({ selected: _, ...c }) => c);
      const result = await confirmSet({
        ...payload,
        cards: selectedCards,
      });
      if ("ok" in result && result.ok === false) {
        setError((result as any).error?.message ?? "Failed to create set");
        setStep("preview");
        return;
      }
      setStep("done");
      const setId = (result as any).setId;
      if (setId) router.push(`/sets/${setId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create set");
      setStep("preview");
    }
  };

  const selectedCount = cards.filter((c) => c.selected).length;

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-bold">AI Card Generation</h1>
        <div className="w-14" />
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 p-3 border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {step === "config" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Set Name</label>
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Methodology</label>
                <select
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value as Methodology)}
                  className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
                >
                  <option value="balanced">Balanced</option>
                  <option value="recent_lapses">Recent Lapses</option>
                  <option value="low_ease">Low Ease</option>
                  <option value="learning_stuck">Learning Stuck</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source Set</label>
                <select
                  value={selectedSetId}
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
                >
                  <option value="">All SRS-enabled sets</option>
                  {srsEnabledSets.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Card Count</label>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addToSrs}
                onChange={(e) => setAddToSrs(e.target.checked)}
              />
              Enable SRS for generated set
            </label>
            <button
              onClick={handleGenerate}
              className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
            >
              Generate Cards
            </button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
            <p className="text-muted text-sm">Generating cards... this may take 10-30 seconds.</p>
          </div>
        )}

        {step === "preview" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">
                {selectedCount} of {cards.length} cards selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("config")}
                  className="px-3 py-1.5 border border-edge rounded-lg text-sm hover:bg-surface-hover"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                  className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
                >
                  Create Set ({selectedCount} cards)
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {cards.map((card, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${card.selected ? "border-edge" : "border-edge opacity-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={card.selected}
                      onChange={(e) => {
                        const updated = [...cards];
                        updated[idx] = { ...updated[idx], selected: e.target.checked };
                        setCards(updated);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 text-sm">
                      {Object.entries(card.fields).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="text-muted">{key}:</span>{" "}
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              const updated = [...cards];
                              updated[idx] = {
                                ...updated[idx],
                                fields: { ...updated[idx].fields, [key]: e.target.value },
                              };
                              setCards(updated);
                            }}
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
          </div>
        )}
      </main>
    </div>
  );
}
