import { getTtsConfig } from "@/lib/types";
import type { WizardState } from "./wizardState";

type Props = {
  state: WizardState;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
};

export default function StepReview({ state, isSubmitting, canSubmit, onSubmit }: Props) {
  const sorted = [...state.fieldDefinitions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Set info */}
      <div>
        <h3 className="text-lg font-semibold">{state.name}</h3>
        {state.description && (
          <p className="text-muted text-sm mt-1">{state.description}</p>
        )}
      </div>

      {/* Field definitions */}
      <div>
        <h4 className="text-sm font-medium mb-2">Fields</h4>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-raised">
                <th className="text-left px-3 py-2 text-xs text-muted">Name</th>
                <th className="text-left px-3 py-2 text-xs text-muted">Role</th>
                <th className="text-left px-3 py-2 text-xs text-muted">TTS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((fd) => {
                const tts = getTtsConfig(fd);
                return (
                  <tr key={fd.name} className="border-t">
                    <td className="px-3 py-2">{fd.name}</td>
                    <td className="px-3 py-2 text-muted">{fd.role}</td>
                    <td className="px-3 py-2 text-muted">
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
              <tr className="bg-raised">
                <th className="text-left px-3 py-2 text-xs text-muted">#</th>
                {sorted.map((fd) => (
                  <th
                    key={fd.name}
                    className="text-left px-3 py-2 text-xs text-muted"
                  >
                    {fd.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.cards.slice(0, 10).map((card, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 text-muted">{i + 1}</td>
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
                    className="px-3 py-2 text-center text-muted border-t"
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
        disabled={isSubmitting || !canSubmit}
        className="w-full py-3 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 font-medium transition-colors"
      >
        {isSubmitting ? "Creating..." : "Create Set"}
      </button>
    </div>
  );
}
