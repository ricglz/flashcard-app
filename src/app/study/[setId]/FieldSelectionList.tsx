import type { FieldDefinition } from "@/lib/types";
import { getDisplayableFields, getTtsConfig } from "@/lib/types";

type Props = {
  fieldDefs: FieldDefinition[];
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
  onToggle: (fieldName: string) => void;
};

type FieldDisplayType = "front" | "back" | "ttsOnly";

function getFieldDisplayType(
  name: string,
  frontFields: readonly string[],
  backFields: readonly string[],
  ttsOnlyFields: readonly string[],
): FieldDisplayType {
  if (frontFields.includes(name)) return "front";
  if (backFields.includes(name)) return "back";
  if (ttsOnlyFields.includes(name)) return "ttsOnly";
  // Defensive fallback — should not happen if assignment covers all fields.
  // Preserve original label fallback to Front; use Front style for consistency
  // instead of original muted fallback which was mismatched.
  return "front";
}

const FIELD_DISPLAY: Record<
  FieldDisplayType,
  { label: string; className: string }
> = {
  front: {
    label: "Front",
    className: "bg-accent/10 border-accent text-accent",
  },
  back: {
    label: "Back",
    className: "bg-warning/10 border-warning text-warning",
  },
  ttsOnly: {
    label: "TTS Only",
    className: "bg-info-surface border-info-edge text-muted",
  },
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
        {getDisplayableFields(fieldDefs).map((fd) => {
          const name = fd.name;
          const type = getFieldDisplayType(
            name,
            frontFields,
            backFields,
            ttsOnlyFields,
          );
          const { label, className } = FIELD_DISPLAY[type];
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-surface-hover flex justify-between items-center ${className}`}
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
