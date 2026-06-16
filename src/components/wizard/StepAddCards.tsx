import { Suspense } from "react";
import type { WizardAction, WizardState } from "./wizardState";
import CsvPath from "./CsvPath";
import ManualPath from "./ManualPath";
import AiPath from "./AiPath";
import { Spinner } from "@/components/ui/Spinner";
import AvailableModelsSuspenseProvider from "@/contexts/AvailableModelsSuspenseProvider";

type Props = {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
};

export default function StepAddCards({ state, dispatch }: Props) {
  if (state.sourceMethod === "csv") {
    return <CsvPath state={state} dispatch={dispatch} />;
  }
  if (state.sourceMethod === "ai") {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner size="md" label="Loading AI models..." />
          </div>
        }
      >
        <AvailableModelsSuspenseProvider>
          <AiPath state={state} dispatch={dispatch} />
        </AvailableModelsSuspenseProvider>
      </Suspense>
    );
  }
  return <ManualPath state={state} dispatch={dispatch} />;
}
