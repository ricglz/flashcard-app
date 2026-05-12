import { FieldDefinition } from "@/lib/types";
import { validateCardFields } from "../../../convex/domain/cardFields";
import { validateFieldDefinitions, validateSetName } from "../../../convex/domain/fieldDefinitions";

export type SourceMethod = "csv" | "manual";

export type WizardState = {
  step: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  sourceMethod: SourceMethod | null;
  fieldDefinitions: FieldDefinition[];
  cards: Record<string, string>[];
};

export type WizardAction =
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_SOURCE_METHOD"; payload: SourceMethod }
  | { type: "SET_FIELD_DEFINITIONS"; payload: FieldDefinition[] }
  | { type: "SET_CARDS"; payload: Record<string, string>[] }
  | { type: "ADD_CARD"; payload: Record<string, string> }
  | { type: "REMOVE_CARD"; payload: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" };

export const initialState: WizardState = {
  step: 1,
  name: "",
  description: "",
  sourceMethod: null,
  fieldDefinitions: [],
  cards: [],
};

export type WizardValidationIssue = {
  step: WizardState["step"];
  field: "name" | "sourceMethod" | "fieldDefinitions" | "cards" | "transition";
  message: string;
};

export type WizardStepValidation =
  | { ok: true; issues: [] }
  | { ok: false; issues: WizardValidationIssue[] };

function resetForSourceMethod(state: WizardState, sourceMethod: SourceMethod): WizardState {
  if (state.sourceMethod === null || state.sourceMethod === sourceMethod) {
    return { ...state, sourceMethod };
  }
  return { ...state, sourceMethod, fieldDefinitions: [], cards: [] };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.payload };
    case "SET_DESCRIPTION":
      return { ...state, description: action.payload };
    case "SET_SOURCE_METHOD":
      return resetForSourceMethod(state, action.payload);
    case "SET_FIELD_DEFINITIONS":
      return { ...state, fieldDefinitions: action.payload };
    case "SET_CARDS":
      return { ...state, cards: action.payload };
    case "ADD_CARD":
      return { ...state, cards: [...state.cards, action.payload] };
    case "REMOVE_CARD":
      return { ...state, cards: state.cards.filter((_, i) => i !== action.payload) };
    case "NEXT_STEP": {
      if (state.step >= 4 || !canProceed(state)) return state;
      return { ...state, step: (state.step + 1) as WizardState["step"] };
    }
    case "PREV_STEP":
      if (state.step > 1) return { ...state, step: (state.step - 1) as WizardState["step"] };
      return state;
    case "RESET":
      return initialState;
  }
}

export function validateWizardStep(state: WizardState, step: WizardState["step"] = state.step): WizardStepValidation {
  const issues: WizardValidationIssue[] = [];

  if (step === 1) {
    const name = validateSetName(state.name);
    if (!name.ok) issues.push({ step, field: "name", message: name.error.message });
    if (state.sourceMethod === null) {
      issues.push({ step, field: "sourceMethod", message: "Choose CSV import or manual entry" });
    }
  }

  if (step === 2 || step === 3 || step === 4) {
    const fields = validateFieldDefinitions(state.fieldDefinitions);
    if (!fields.ok) issues.push({ step, field: "fieldDefinitions", message: fields.error.message });
    if (state.cards.length === 0) {
      issues.push({ step, field: "cards", message: "Add at least one card" });
    }
    for (const card of state.cards) {
      const result = validateCardFields(state.fieldDefinitions.map((fd) => fd.name), card);
      if (!result.ok) {
        issues.push({ step, field: "cards", message: result.error.message });
        break;
      }
    }
  }

  return issues.length === 0 ? { ok: true, issues: [] } : { ok: false, issues };
}

export function canProceed(state: WizardState): boolean {
  return validateWizardStep(state).ok;
}
