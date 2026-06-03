import type { ReactNode } from "react";
import Link from "next/link";
import GearIcon from "./GearIcon";

const SRS_NAV_START_KEY = "srs-nav-start";

function markSrsNavigationStart() {
  window.sessionStorage.setItem(SRS_NAV_START_KEY, String(performance.now()));
}

export default function SrsQueueActive({
  remaining,
  reviewedToday,
  onToggleSettings,
  settingsPanel,
}: {
  remaining: number;
  reviewedToday: number;
  onToggleSettings: () => void;
  settingsPanel: ReactNode;
}) {
  return (
    <div className="mb-6 p-4 border border-accent/30 bg-accent/5 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {remaining} card{remaining !== 1 ? "s" : ""} to review
          </p>
          {reviewedToday > 0 && (
            <p className="text-sm text-muted">
              {reviewedToday} reviewed today
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSettings}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="SRS settings"
            title="SRS settings"
          >
            <GearIcon />
          </button>
          <Link
            href="/srs"
            onClick={markSrsNavigationStart}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-colors"
          >
            Start Review
          </Link>
        </div>
      </div>
      {settingsPanel}
    </div>
  );
}
