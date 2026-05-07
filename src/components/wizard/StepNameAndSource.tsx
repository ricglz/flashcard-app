import { LANGUAGE_PRESETS, PRESET_KEYS } from "@/lib/presets";
import { WizardAction, WizardState } from "./wizardState";
import SourceCard from "./SourceCard";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
};

export default function StepNameAndSource({ state, dispatch }: Props) {
  const handlePresetSelect = (key: string) => {
    const preset = LANGUAGE_PRESETS[key];
    if (preset) {
      dispatch({ type: "SET_FIELD_DEFINITIONS", payload: preset.fieldDefinitions });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Set Name</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => dispatch({ type: "SET_NAME", payload: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          placeholder="e.g., 100 Common Chinese Characters"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Description (optional)
        </label>
        <textarea
          value={state.description}
          onChange={(e) => dispatch({ type: "SET_DESCRIPTION", payload: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          rows={2}
          placeholder="What this set is for..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">
          How do you want to add cards?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SourceCard
            title="Import CSV"
            description="Upload a CSV file with your cards"
            selected={state.sourceMethod === "csv"}
            onClick={() => dispatch({ type: "SET_SOURCE_METHOD", payload: "csv" })}
          />
          <SourceCard
            title="Add Manually"
            description="Type cards one by one"
            selected={state.sourceMethod === "manual"}
            onClick={() => dispatch({ type: "SET_SOURCE_METHOD", payload: "manual" })}
          />
        </div>
      </div>

      {state.sourceMethod === "manual" && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Start from a preset (optional)
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) handlePresetSelect(e.target.value);
            }}
            className="w-full px-3 py-2 border rounded"
            defaultValue=""
          >
            <option value="">No preset — define fields in next step</option>
            {PRESET_KEYS.map((key) => (
              <option key={key} value={key}>
                {LANGUAGE_PRESETS[key].label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
