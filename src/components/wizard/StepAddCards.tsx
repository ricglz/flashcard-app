import { useState } from "react";
import { FieldDefinition } from "@/lib/types";
import CsvImporter from "@/components/CsvImporter";
import CardForm from "@/components/CardForm";
import { WizardAction, WizardState } from "./wizardState";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
};

export default function StepAddCards({ state, dispatch }: Props) {
  if (state.sourceMethod === "csv") {
    return <CsvPath state={state} dispatch={dispatch} />;
  }
  return <ManualPath state={state} dispatch={dispatch} />;
}

function CsvPath({ state, dispatch }: Props) {
  return (
    <div className="space-y-4">
      <CsvImporter
        onImport={(result) => {
          dispatch({ type: "SET_CARDS", payload: result.cards });
          dispatch({ type: "SET_FIELD_DEFINITIONS", payload: result.fieldDefinitions });
        }}
      />
      {state.cards.length > 0 && (
        <p className="text-sm text-green-600">
          {state.cards.length} cards ready with{" "}
          {state.fieldDefinitions.length} fields
        </p>
      )}
    </div>
  );
}

function ManualPath({ state, dispatch }: Props) {
  const [newFieldName, setNewFieldName] = useState("");

  const addFieldName = () => {
    const name = newFieldName.trim();
    if (!name) return;
    if (state.fieldDefinitions.some((fd) => fd.name === name)) return;
    const field: FieldDefinition = {
      name,
      role: "primary",
      metadata: {},
      order: state.fieldDefinitions.length,
    };
    dispatch({
      type: "SET_FIELD_DEFINITIONS",
      payload: [...state.fieldDefinitions, field],
    });
    setNewFieldName("");
  };

  const removeField = (index: number) => {
    const name = state.fieldDefinitions[index].name;
    const updatedDefs = state.fieldDefinitions
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, order: i }));
    dispatch({ type: "SET_FIELD_DEFINITIONS", payload: updatedDefs });
    // Remove field key from existing cards
    dispatch({
      type: "SET_CARDS",
      payload: state.cards.map((card) => {
        const rest = Object.fromEntries(
      Object.entries(card).filter(([key]) => key !== name)
    );
        return rest;
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Field name setup */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Define your fields
        </label>
        {state.fieldDefinitions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {state.fieldDefinitions.map((fd, i) => (
              <span
                key={fd.name}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                {fd.name}
                <button
                  onClick={() => removeField(i)}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFieldName())}
            className="flex-1 px-3 py-2 border rounded text-sm"
            placeholder="Field name (e.g., Character, Pinyin, Meaning)"
          />
          <button
            type="button"
            onClick={addFieldName}
            className="px-3 py-2 bg-gray-100 border rounded text-sm hover:bg-gray-200"
          >
            Add Field
          </button>
        </div>
      </div>

      {/* Card entry */}
      {state.fieldDefinitions.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Add cards</label>
          <CardForm
            fieldDefinitions={state.fieldDefinitions}
            onSubmit={(fields) => dispatch({ type: "ADD_CARD", payload: fields })}
          />
        </div>
      )}

      {/* Cards table */}
      {state.cards.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            {state.cards.length} card{state.cards.length !== 1 ? "s" : ""} added
          </p>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs text-gray-500">#</th>
                  {state.fieldDefinitions.map((fd) => (
                    <th
                      key={fd.name}
                      className="text-left px-3 py-2 text-xs text-gray-500"
                    >
                      {fd.name}
                    </th>
                  ))}
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {state.cards.map((card, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {state.fieldDefinitions.map((fd) => (
                      <td key={fd.name} className="px-3 py-2">
                        {card[fd.name] ?? ""}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => dispatch({ type: "REMOVE_CARD", payload: i })}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
