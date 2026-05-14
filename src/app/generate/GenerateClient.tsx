"use client";

import { useState, useMemo } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import { useRouter } from "next/navigation";
import { asId } from "@/lib/convexHelpers";
import type { GeneratedSetPayload } from "@/lib/aiToolingSchemas";
import type { Methodology } from "@/lib/types";
import GenerateConfigForm from "./GenerateConfigForm";
import GeneratePreview from "./GeneratePreview";

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
    [userSets],
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
  const [payload, setPayload] = useState<GeneratedSetPayload | null>(null);
  const handleGenerate = async () => {
    setStep("loading");
    setError(null);
    try {
      const result = await generateCards({
        methodology,
        ...(selectedSetId ? { setId: asId<"flashcardSets">(selectedSetId) } : {}),
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
      setPayload(result.payload as GeneratedSetPayload);
      const payloadCards = (result.payload as GeneratedSetPayload).cards;
      setCards(
        payloadCards.map((c) => ({
          fields: { ...c.fields },
          sourceCardIds: c.sourceCardIds ? [...c.sourceCardIds] : undefined,
          rationale: c.rationale,
          selected: true,
        }))
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
        .map(({ selected: _, ...c }) => ({
          ...c,
          sourceCardIds: c.sourceCardIds?.map((id) => asId<"flashcards">(id)),
        }));
      const result = await confirmSet({
        name: payload.name,
        description: payload.description,
        sourceSetIds: [...payload.sourceSetIds].map((id) => asId<"flashcardSets">(id)),
        sourceScope: payload.sourceScope,
        weakContextMethodology: payload.weakContextMethodology,
        fieldDefinitions: [...payload.fieldDefinitions].map((fd) => ({ ...fd, metadata: { ...fd.metadata } })),
        addToSrs: payload.addToSrs,
        cards: selectedCards,
      });
      if ("ok" in result && result.ok === false) {
        setError(result.error ?? "Failed to create set");
        setStep("preview");
        return;
      }
      setStep("done");
      if ("setId" in result) router.push(`/sets/${result.setId}`);
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
          <GenerateConfigForm
            setName={setName}
            onSetNameChange={setSetName}
            methodology={methodology}
            onMethodologyChange={setMethodology}
            selectedSetId={selectedSetId}
            onSelectedSetIdChange={setSelectedSetId}
            srsEnabledSets={srsEnabledSets}
            targetCount={targetCount}
            onTargetCountChange={setTargetCount}
            model={model}
            onModelChange={setModel}
            addToSrs={addToSrs}
            onAddToSrsChange={setAddToSrs}
            onGenerate={handleGenerate}
          />
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
            <p className="text-muted text-sm">Generating cards... this may take 10-30 seconds.</p>
          </div>
        )}

        {step === "preview" && (
          <GeneratePreview
            cards={cards}
            selectedCount={selectedCount}
            onCardsChange={setCards}
            onBack={() => setStep("config")}
            onConfirm={handleConfirm}
          />
        )}
      </main>
    </div>
  );
}
