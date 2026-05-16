import CsvImporter from "@/components/CsvImporter";
import type { WizardAction, WizardState } from "./wizardState";

export default function CsvPath({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  return (
    <div className="space-y-4">
      <CsvImporter
        onImport={(result) => {
          if (!result.ok) return;
          dispatch({ type: "SET_CARDS", payload: result.cards });
          dispatch({ type: "SET_FIELD_DEFINITIONS", payload: result.fieldDefinitions });
        }}
      />
      {state.cards.length > 0 && (
        <p className="text-sm text-accent">
          {state.cards.length} cards ready with{" "}
          {state.fieldDefinitions.length} fields
        </p>
      )}
    </div>
  );
}
