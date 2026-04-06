import { getTtsConfig } from "@/lib/types";
import { WizardState } from "./wizardState";

type Props = {
  state: WizardState;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export default function StepReview({ state, isSubmitting, onSubmit }: Props) {
  const sorted = [...state.fieldDefinitions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Set info */}
      <div>
        <h3 className="text-lg font-semibold">{state.name}</h3>
        {state.description && (
          <p className="text-gray-500 text-sm mt-1">{state.description}</p>
        )}
      </div>

      {/* Field definitions */}
      <div>
        <h4 className="text-sm font-medium mb-2">Fields</h4>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-xs text-gray-500">Name</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500">Role</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500">TTS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((fd) => {
                const tts = getTtsConfig(fd);
                return (
                  <tr key={fd.name} className="border-t">
                    <td className="px-3 py-2">{fd.name}</td>
                    <td className="px-3 py-2 text-gray-600">{fd.role}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {tts ? tts.lang : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards preview */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          Cards ({state.cards.length})
        </h4>
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-xs text-gray-500">#</th>
                {sorted.map((fd) => (
                  <th
                    key={fd.name}
                    className="text-left px-3 py-2 text-xs text-gray-500"
                  >
                    {fd.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.cards.slice(0, 10).map((card, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  {sorted.map((fd) => (
                    <td key={fd.name} className="px-3 py-2">
                      {card[fd.name] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
              {state.cards.length > 10 && (
                <tr>
                  <td
                    colSpan={sorted.length + 1}
                    className="px-3 py-2 text-center text-gray-400 border-t"
                  >
                    ...and {state.cards.length - 10} more
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {isSubmitting ? "Creating..." : "Create Set"}
      </button>
    </div>
  );
}
