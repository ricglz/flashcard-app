"use client";

const STEP_LABELS = ["Name & Source", "Add Cards", "Configure Fields", "Review"];

export default function WizardStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isCurrent = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${
                  isCompleted ? "bg-accent" : "bg-edge"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  isCurrent
                    ? "bg-accent text-white"
                    : isCompleted
                      ? "bg-accent-surface text-accent-surface-text"
                      : "bg-raised text-muted"
                }`}
              >
                {stepNum}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  isCurrent
                    ? "font-medium text-foreground"
                    : isCompleted
                      ? "text-muted"
                      : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
