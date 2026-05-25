import type { ReactNode } from "react";
import GearIcon from "./GearIcon";

export default function SrsQueueComplete({
  reviewedToday,
  resetTimeStr,
  onToggleSettings,
  onLoadMore,
  isLoadingMore,
  noMoreCards,
  settingsPanel,
}: {
  reviewedToday: number;
  resetTimeStr: string;
  onToggleSettings: () => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  noMoreCards: boolean;
  settingsPanel: ReactNode;
}) {
  return (
    <div className="mb-6 p-4 border border-success-edge bg-success-surface rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-success font-medium">
            All done for today! You reviewed {reviewedToday} card
            {reviewedToday !== 1 ? "s" : ""}.
          </p>
          <p className="text-xs text-success mt-1">
            Next reset at {resetTimeStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSettings}
            className="text-success hover:text-success/80 transition-colors"
            aria-label="SRS settings"
            title="SRS settings"
          >
            <GearIcon />
          </button>
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-3 py-1.5 text-sm font-medium border border-success-edge text-success rounded-lg hover:bg-success-surface/70 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load more cards"}
          </button>
        </div>
      </div>
      {noMoreCards && (
        <p className="text-xs text-muted mt-2">
          No new cards available — you&apos;ve seen them all!
        </p>
      )}
      {settingsPanel}
    </div>
  );
}
