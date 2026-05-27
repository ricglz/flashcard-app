"use client";

import { useState, useMemo } from "react";
import { useAction } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { useRouter, useSearchParams } from "next/navigation";
import { parseId } from "@/lib/convexHelpers";
import { cloneFieldDefinitionsForAction } from "@/lib/generatedSetDraft";
import { selectedCardsForConfirm } from "@/lib/generatedDraftCards";
import { useGeneratedDraftCards } from "@/hooks/useGeneratedDraftCards";
import { isMethodology } from "@/lib/types";
import { parseOptionalWeakCardsDateRangeParams } from "@/lib/weakCardsDateRange";
import GenerateConfigForm, { type GenerateConfig } from "./GenerateConfigForm";
import GeneratePreview from "./GeneratePreview";
import AiErrorMessage from "@/components/AiErrorMessage";
import PageHeader from "@/components/PageHeader";

type Step = "config" | "loading" | "preview" | "done";

export default function GenerateClient({
  preloadedSets,
}: {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userSets = useOfflinePreloadedQuery(preloadedSets);
  const generateCards = useAction(api.ai.generateRemedialCards);
  const confirmSet = useAction(api.ai.confirmGeneratedSet);

  const srsEnabledSets = useMemo(
    () => userSets.filter((s) => s.userSet.srsEnabled),
    [userSets],
  );

  const methodologyParam = searchParams.get("methodology");
  const initialMethodology = isMethodology(methodologyParam) ? methodologyParam : "balanced";

  const initialSetId = searchParams.get("setId") ?? "";
  const incomingDateRange = parseOptionalWeakCardsDateRangeParams(
    searchParams.get("from"),
    searchParams.get("to"),
  );

  const [step, setStep] = useState<Step>("config");
  const [config, setConfig] = useState<GenerateConfig>({
    setName: "Remedial Cards",
    methodology: initialMethodology,
    selectedSetId: initialSetId,
    targetCount: 20,
    model: "",
    instructions: "",
    addToSrs: true,
  });
  const [error, setError] = useState<string | null>(null);
  const {
    payload,
    cards,
    selectedCount,
    setCards,
    refinementModel,
    setRefinementModel,
    applyPayload,
    isRefining,
    refineDraft,
  } = useGeneratedDraftCards({
    onError: setError,
  });

  const handleGenerate = async (config: GenerateConfig) => {
    setStep("loading");
    setError(null);
    try {
      if (incomingDateRange.status === "invalid") {
        setError(incomingDateRange.error);
        setStep("config");
        return;
      }
      const selectedSetId = config.selectedSetId
        ? parseId<"flashcardSets">(config.selectedSetId)
        : null;
      if (config.selectedSetId && !selectedSetId) {
        setError("Invalid source set.");
        setStep("config");
        return;
      }
      const result = await generateCards({
        methodology: config.methodology,
        ...(selectedSetId ? { setId: selectedSetId } : {}),
        targetCardCount: config.targetCount,
        name: config.setName,
        ...(config.model ? { model: config.model } : {}),
        ...(config.instructions ? { instructions: config.instructions } : {}),
        ...(incomingDateRange.status === "valid"
          ? { reviewFilter: incomingDateRange.reviewFilter }
          : {}),
        addToSrs: config.addToSrs,
      });
      if (!result.ok) {
        setError(result.error.message);
        setStep("config");
        return;
      }
      if (!result.value.validation.ok) {
        setError(`Validation issues: ${result.value.validation.issues.join(", ")}`);
        setStep("config");
        return;
      }
      applyPayload(result.value.payload, config.model);
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
      const result = await confirmSet({
        name: payload.name,
        description: payload.description,
        sourceSetIds: [...payload.sourceSetIds],
        sourceScope: payload.sourceScope,
        weakContextMethodology: payload.weakContextMethodology,
        fieldDefinitions: cloneFieldDefinitionsForAction(payload.fieldDefinitions),
        addToSrs: payload.addToSrs,
        cards: selectedCardsForConfirm(cards),
      });
      if (!result.ok) {
        setError(result.error.message);
        setStep("preview");
        return;
      }
      setStep("done");
      router.push(`/sets/${result.value.setId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create set");
      setStep("preview");
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="AI Card Generation" onBack={() => router.back()} backDisabled={isRefining} />

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <AiErrorMessage message={error} />
        </div>

        {step === "config" && (
          <GenerateConfigForm
            value={config}
            onChange={setConfig}
            srsEnabledSets={srsEnabledSets}
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
            onRefine={refineDraft}
            refinementModel={refinementModel}
            onRefinementModelChange={setRefinementModel}
            isRefining={isRefining}
          />
        )}
      </main>
    </div>
  );
}
