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
    <div className="mb-6 p-4 border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-green-700 dark:text-green-300 font-medium">
            All done for today! You reviewed {reviewedToday} card
            {reviewedToday !== 1 ? "s" : ""}.
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Next reset at {resetTimeStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSettings}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            aria-label="SRS settings"
            title="SRS settings"
          >
            <GearIcon />
          </button>
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-3 py-1.5 text-sm font-medium border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900 transition-colors disabled:opacity-50"
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
