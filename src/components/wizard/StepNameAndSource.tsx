import { isPresetKey, LANGUAGE_PRESETS, PRESET_KEYS } from "@/lib/presets";
import { Select } from "@/components/ui/Select";
import type { WizardAction, WizardState } from "./wizardState";
import SourceCard from "./SourceCard";

const PRESET_SELECT_OPTIONS = ["", ...PRESET_KEYS];
const PRESET_SELECT_LABELS: Record<string, string> = {
  "": "No preset - define fields in next step",
  ...Object.fromEntries(
    PRESET_KEYS.map((key) => [key, LANGUAGE_PRESETS[key].label]),
  ),
};

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  aiAvailable?: boolean;
};

export default function StepNameAndSource({ state, dispatch, aiAvailable }: Props) {
  const handlePresetSelect = (key: string) => {
    if (isPresetKey(key)) {
      const preset = LANGUAGE_PRESETS[key];
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          {aiAvailable && (
            <SourceCard
              title="AI Generate"
              description="Generate cards with AI from a prompt"
              selected={state.sourceMethod === "ai"}
              onClick={() => dispatch({ type: "SET_SOURCE_METHOD", payload: "ai" })}
            />
          )}
        </div>
      </div>

      {(state.sourceMethod === "manual" || state.sourceMethod === "ai") && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Start from a preset (optional)
          </label>
          <Select
            value=""
            options={PRESET_SELECT_OPTIONS}
            labels={PRESET_SELECT_LABELS}
            onChange={(value) => {
              if (value) handlePresetSelect(value);
            }}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
