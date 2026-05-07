import type { ReactNode } from "react";
import GearIcon from "./GearIcon";

export default function SrsQueueEmpty({
  resetTimeStr,
  onToggleSettings,
  settingsPanel,
}: {
  resetTimeStr: string;
  onToggleSettings: () => void;
  settingsPanel: ReactNode;
}) {
  return (
    <div className="mb-6 p-4 border border-edge rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">No cards to review right now.</p>
          <p className="text-xs text-muted mt-1">
            Next reset at {resetTimeStr}
          </p>
        </div>
        <button
          onClick={onToggleSettings}
          className="text-muted hover:text-foreground transition-colors"
          aria-label="SRS settings"
          title="SRS settings"
        >
          <GearIcon />
        </button>
      </div>
      {settingsPanel}
    </div>
  );
}
