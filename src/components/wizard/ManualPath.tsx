import { useState } from "react";
import CardForm from "@/components/CardForm";
import {
  addFieldDefinition,
  removeFieldDefinition,
  removeFieldValueFromCards,
} from "@/lib/fieldDefinitionsDraft";
import type { WizardAction, WizardState } from "./wizardState";

export default function ManualPath({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}) {
  const [newFieldName, setNewFieldName] = useState("");

  const addFieldName = () => {
    const updated = addFieldDefinition(state.fieldDefinitions, newFieldName);
    if (updated.length === state.fieldDefinitions.length) return;
    dispatch({
      type: "SET_FIELD_DEFINITIONS",
      payload: updated,
    });
    setNewFieldName("");
  };

  const removeField = (index: number) => {
    const field = state.fieldDefinitions[index];
    if (!field) return;
    const name = field.name;
    const updatedDefs = removeFieldDefinition(state.fieldDefinitions, index);
    dispatch({ type: "SET_FIELD_DEFINITIONS", payload: updatedDefs });
    dispatch({
      type: "SET_CARDS",
      payload: removeFieldValueFromCards(state.cards, name),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Define your fields
        </label>
        {state.fieldDefinitions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {state.fieldDefinitions.map((fd, i) => (
              <span
                key={fd.name}
                className="inline-flex items-center gap-1 px-3 py-1 bg-raised rounded-full text-sm"
              >
                {fd.name}
                <button
                  onClick={() => removeField(i)}
                  className="text-muted hover:text-danger ml-1 transition-colors"
                  aria-label={`Remove field ${fd.name}`}
                  title={`Remove field ${fd.name}`}
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
            className="px-3 py-2 bg-raised border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Add Field
          </button>
        </div>
      </div>

      {state.fieldDefinitions.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Add cards</label>
          <CardForm
            fieldDefinitions={state.fieldDefinitions}
            onSubmit={(fields) => dispatch({ type: "ADD_CARD", payload: fields })}
          />
        </div>
      )}

      {state.cards.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            {state.cards.length} card{state.cards.length !== 1 ? "s" : ""} added
          </p>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-raised">
                  <th className="text-left px-3 py-2 text-xs text-muted">#</th>
                  {state.fieldDefinitions.map((fd) => (
                    <th
                      key={fd.name}
                      className="text-left px-3 py-2 text-xs text-muted"
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
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    {state.fieldDefinitions.map((fd) => (
                      <td key={fd.name} className="px-3 py-2">
                        {card[fd.name] ?? ""}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => dispatch({ type: "REMOVE_CARD", payload: i })}
                        className="text-danger hover:text-danger-hover text-xs transition-colors"
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
