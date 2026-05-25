import type { FieldDefinition } from "@/lib/types";
import { getDisplayableFields, getTtsConfig } from "@/lib/types";

type Props = {
  fieldDefs: FieldDefinition[];
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
  onToggle: (fieldName: string) => void;
};

export default function FieldSelectionList({
  fieldDefs,
  frontFields,
  backFields,
  ttsOnlyFields,
  onToggle,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Study Direction</h2>
      <p className="text-xs text-muted">
        Tap a field to cycle: Front → Back{" "}
        {fieldDefs.some((fd) => getTtsConfig(fd) !== null) && "→ TTS Only "}→
        Front
      </p>

      <div className="space-y-2">
        {getDisplayableFields(fieldDefs)
          .map((fd) => {
            const name = fd.name;
            const isFront = frontFields.includes(name);
            const isBack = backFields.includes(name);
            const isTtsOnly = ttsOnlyFields.includes(name);
            const label = isFront
              ? "Front"
              : isBack
                ? "Back"
                : isTtsOnly
                  ? "TTS Only"
                  : "Front";
            const style = isFront
              ? "bg-accent/10 border-accent text-accent"
              : isBack
                ? "bg-warning/10 border-warning text-warning"
                : isTtsOnly
                  ? "bg-info-surface border-info-edge text-muted"
                  : "border-edge text-muted";
            return (
              <button
                key={name}
                onClick={() => onToggle(name)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-surface-hover flex justify-between items-center ${style}`}
              >
                <span>{name}</span>
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
