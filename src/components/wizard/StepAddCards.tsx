import { WizardAction, WizardState } from "./wizardState";
import CsvPath from "./CsvPath";
import ManualPath from "./ManualPath";
import AiPath from "./AiPath";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
};

export default function StepAddCards({ state, dispatch }: Props) {
  if (state.sourceMethod === "csv") {
    return <CsvPath state={state} dispatch={dispatch} />;
  }
  if (state.sourceMethod === "ai") {
    return <AiPath state={state} dispatch={dispatch} />;
  }
  return <ManualPath state={state} dispatch={dispatch} />;
}
