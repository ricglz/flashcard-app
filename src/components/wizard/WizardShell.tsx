"use client";

import { useReducer, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  wizardReducer,
  initialState,
  canProceed,
} from "./wizardState";
import StepNameAndSource from "./StepNameAndSource";
import StepAddCards from "./StepAddCards";
import StepConfigureFields from "./StepConfigureFields";
import StepReview from "./StepReview";

const STEP_LABELS = ["Name & Source", "Add Cards", "Configure Fields", "Review"];

export default function WizardShell() {
  const router = useRouter();
  const createSet = useMutation(api.flashcardSets.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const setId = await createSet({
        name: state.name.trim(),
        description: state.description.trim() || undefined,
        fieldDefinitions: state.fieldDefinitions,
      });
      if (state.cards.length > 0) {
        await batchCreateCards({
          setId,
          cards: state.cards.map((fields, i) => ({ fields, order: i })),
        });
      }
      router.push(`/sets/${setId}`);
    } catch (err) {
      console.error("Failed to create set:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isCurrent = stepNum === state.step;
          const isCompleted = stepNum < state.step;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${
                    isCompleted ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {stepNum}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    isCurrent
                      ? "font-medium text-gray-900"
                      : isCompleted
                        ? "text-gray-600"
                        : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div>
        {state.step === 1 && (
          <StepNameAndSource state={state} dispatch={dispatch} />
        )}
        {state.step === 2 && (
          <StepAddCards state={state} dispatch={dispatch} />
        )}
        {state.step === 3 && (
          <StepConfigureFields state={state} dispatch={dispatch} />
        )}
        {state.step === 4 && (
          <StepReview
            state={state}
            isSubmitting={isSubmitting}
            onSubmit={handleCreate}
          />
        )}
      </div>

      {/* Navigation */}
      {state.step < 4 && (
        <div className="flex justify-between pt-4 border-t">
          <button
            type="button"
            onClick={() => dispatch({ type: "PREV_STEP" })}
            disabled={state.step === 1}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "NEXT_STEP" })}
            disabled={!canProceed(state)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
