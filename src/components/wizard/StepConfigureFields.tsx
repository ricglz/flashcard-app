import FieldDefinitionEditor from "@/components/FieldDefinitionEditor";
import { WizardAction, WizardState } from "./wizardState";
import CardPreview from "./CardPreview";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
};

export default function StepConfigureFields({ state, dispatch }: Props) {
  const sampleCards = state.cards.slice(0, 2);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Configure the role and TTS settings for each field. The preview on the
        right shows how your cards will look.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-2">Card Preview</label>
          {sampleCards.length === 0 ? (
            <p className="text-sm text-muted italic">No cards to preview</p>
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
