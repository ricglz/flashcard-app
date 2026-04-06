import { FieldDefinition } from "@/lib/types";

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
  | { type: "PREV_STEP" };

export const initialState: WizardState = {
  step: 1,
  name: "",
  description: "",
  sourceMethod: null,
  fieldDefinitions: [],
  cards: [],
};

export function wizardReducer(
  state: WizardState,
  action: WizardAction
): WizardState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.payload };
    case "SET_DESCRIPTION":
      return { ...state, description: action.payload };
    case "SET_SOURCE_METHOD":
      return { ...state, sourceMethod: action.payload };
    case "SET_FIELD_DEFINITIONS":
      return { ...state, fieldDefinitions: action.payload };
    case "SET_CARDS":
      return { ...state, cards: action.payload };
    case "ADD_CARD":
      return { ...state, cards: [...state.cards, action.payload] };
    case "REMOVE_CARD":
      return {
        ...state,
        cards: state.cards.filter((_, i) => i !== action.payload),
      };
    case "NEXT_STEP":
      if (state.step < 4)
        return { ...state, step: (state.step + 1) as WizardState["step"] };
      return state;
    case "PREV_STEP":
      if (state.step > 1)
        return { ...state, step: (state.step - 1) as WizardState["step"] };
      return state;
  }
}

export function canProceed(state: WizardState): boolean {
  switch (state.step) {
    case 1:
      return state.name.trim().length > 0 && state.sourceMethod !== null;
    case 2:
      return state.cards.length > 0 && state.fieldDefinitions.length > 0;
    case 3:
      return state.fieldDefinitions.length > 0;
    case 4:
      return true;
  }
}
