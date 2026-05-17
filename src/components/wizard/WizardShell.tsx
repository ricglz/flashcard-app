"use client";


import { useReducer, useState } from "react";
import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAiAvailablePreloaded } from "@/hooks/useAiAvailable";
import Link from "next/link";
import {
  wizardReducer,
  initialState,
  canProceed,
  validateWizardStep,
} from "./wizardState";
import StepNameAndSource from "./StepNameAndSource";
import StepAddCards from "./StepAddCards";
import StepConfigureFields from "./StepConfigureFields";
import StepReview from "./StepReview";
import WizardStepIndicator from "./WizardStepIndicator";

const STEP_COUNT = 4;

export default function WizardShell({
  preloadedHasLlmKey,
}: {
  preloadedHasLlmKey: Preloaded<typeof api.userSettings.hasLlmKey>;
}) {
  const createSet = useMutation(api.flashcardSets.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);
  const ai = useAiAvailablePreloaded(preloadedHasLlmKey);
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSetId, setCreatedSetId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const validation = validateWizardStep({ ...state, step: STEP_COUNT });
    if (!validation.ok) {
      setSubmitError(validation.issues[0]?.message ?? "Fix validation errors before creating the set.");
      setIsSubmitting(false);
      return;
    }
    try {
      const setResult = await createSet({
        name: state.name.trim(),
        description: state.description.trim() || undefined,
        fieldDefinitions: state.fieldDefinitions,
      });
      if (!setResult.ok) {
        setSubmitError(setResult.error.message);
        setIsSubmitting(false);
        return;
      }
      const setId = setResult.value;
      if (state.cards.length > 0) {
        const cardResult = await batchCreateCards({
          setId,
          cards: state.cards.map((fields, i) => ({ fields, order: i })),
        });
        if (!cardResult.ok) {
          setSubmitError(cardResult.error.message);
          setIsSubmitting(false);
          return;
        }
      }
      setCreatedSetId(setId);
    } catch (err) {
      console.error("Failed to create set:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to create set");
      setIsSubmitting(false);
    }
  };

  if (createdSetId) {
    return (
      <div className="text-center py-12 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Set created!</h2>
          <p className="text-muted">
            Your flashcard set is ready to use.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link
            href={`/sets/${createdSetId}`}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            View Set
          </Link>
          <button
            onClick={() => {
              dispatch({ type: "RESET" });
              setCreatedSetId(null);
              setIsSubmitting(false);
            }}
            className="px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WizardStepIndicator currentStep={state.step} />

      {/* Step content */}
      <div>
        {state.step === 1 && (
          <StepNameAndSource state={state} dispatch={dispatch} aiAvailable={ai.available} />
        )}
        {state.step === 2 && (
          <StepAddCards state={state} dispatch={dispatch} />
        )}
        {state.step === 3 && (
          <StepConfigureFields state={state} dispatch={dispatch} />
        )}
        {state.step === STEP_COUNT && (
          <>
            <StepReview
              state={state}
              isSubmitting={isSubmitting}
              onSubmit={handleCreate}
            />
            {submitError && (
              <p className="mt-3 text-sm text-danger">{submitError}</p>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {state.step < STEP_COUNT && (
        <div className="flex justify-between pt-4 border-t">
          <button
            type="button"
            onClick={() => dispatch({ type: "PREV_STEP" })}
            disabled={state.step === 1}
            className="px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "NEXT_STEP" })}
            disabled={!canProceed(state)}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
