import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import TtsButton from "@/components/TtsButton";
import { getTtsConfig } from "@/lib/types";
import { WizardAction, WizardState } from "./wizardState";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
};

export default function StepConfigureFields({ state, dispatch }: Props) {
  const sampleCards = state.cards.slice(0, 2);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Configure the role and TTS settings for each field. The preview on the
        right shows how your cards will look.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Field editor */}
        <div className="lg:col-span-3">
          <FieldDefinitionEditor
            value={state.fieldDefinitions}
            onChange={(fds) =>
              dispatch({ type: "SET_FIELD_DEFINITIONS", payload: fds })
            }
            readOnlyNames
            allowAddRemove={false}
          />
        </div>

        {/* Card preview — matches StudyCard visual style */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-2">Card Preview</label>
          {sampleCards.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No cards to preview</p>
          ) : (
            <div className="space-y-4">
              {sampleCards.map((card, i) => (
                <CardPreview
                  key={i}
                  card={card}
                  fieldDefinitions={state.fieldDefinitions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardPreview({
  card,
  fieldDefinitions,
}: {
  card: Record<string, string>;
  fieldDefinitions: WizardState["fieldDefinitions"];
}) {
  const sorted = [...fieldDefinitions].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white border-2 rounded-xl p-8 shadow-sm">
      <div className="space-y-4">
        {sorted.map((fd) => {
          const value = card[fd.name] ?? "";
          const ttsConfig = getTtsConfig(fd);
          return (
            <div key={fd.name} className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                {fd.name}
              </p>
              <div className="flex items-center justify-center gap-2">
                <p
                  className={
                    fd.role === "primary"
                      ? "text-4xl font-bold"
                      : fd.role === "pronunciation"
                        ? "text-2xl"
                        : fd.role === "note"
                          ? "text-lg text-gray-500"
                          : "text-2xl"
                  }
                >
                  {value || "—"}
                </p>
                {ttsConfig && value && (
                  <TtsButton text={value} lang={ttsConfig.lang} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
