import TtsButton from "@/components/TtsButton";
import { getTtsConfig } from "@/lib/types";
import type { WizardState } from "./wizardState";

export default function CardPreview({
  card,
  fieldDefinitions,
}: {
  card: WizardState["cards"][number];
  fieldDefinitions: WizardState["fieldDefinitions"];
}) {
  const sorted = [...fieldDefinitions].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-card-bg border-2 border-card-border rounded-xl p-8 shadow-sm">
      <div className="space-y-4">
        {sorted.map((fd) => {
          const value = card.fields[fd.name] ?? "";
          const ttsConfig = getTtsConfig(fd);
          return (
            <div key={fd.name} className="text-center">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
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
                          ? "text-lg text-muted"
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
