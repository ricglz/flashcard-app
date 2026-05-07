"use client";

import { useReducer, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
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
  const createSet = useMutation(api.flashcardSets.create);
  const batchCreateCards = useMutation(api.flashcards.batchCreate);
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSetId, setCreatedSetId] = useState<string | null>(null);

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
      setCreatedSetId(setId);
    } catch (err) {
      console.error("Failed to create set:", err);
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
                    isCompleted ? "bg-accent" : "bg-edge"
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCurrent
                      ? "bg-accent text-white"
                      : isCompleted
                        ? "bg-accent-surface text-accent-surface-text"
                        : "bg-raised text-muted"
                  }`}
                >
                  {stepNum}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    isCurrent
                      ? "font-medium text-foreground"
                      : isCompleted
                        ? "text-muted"
                        : "text-muted"
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
