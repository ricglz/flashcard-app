import Link from "next/link";
import type { CardRating } from "@/lib/types";
import {
  CARD_RATINGS,
  SRS_RATING_LABELS,
  CARD_RATING_SCORES,
} from "@/lib/types";
import type { SrsReviewLoadMoreState } from "./srsReviewWorkflow";
import SrsReviewLoadMoreControls from "./SrsReviewLoadMoreControls";

export default function SrsReviewComplete({
  reviewedCount,
  ratingCounts,
  reviewedToday,
  onLoadMore,
  loadMore,
}: {
  reviewedCount: number;
  ratingCounts: Record<CardRating, number>;
  reviewedToday: number;
  onLoadMore: () => void;
  loadMore: SrsReviewLoadMoreState;
}) {
  const totalScore =
    reviewedCount > 0
      ? CARD_RATINGS.reduce(
          (sum, rating) =>
            sum + CARD_RATING_SCORES[rating] * ratingCounts[rating],
          0
        ) /
        (reviewedCount * 3)
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Dashboard
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-2">All done!</h2>
          <p className="text-muted mb-6">
            You reviewed {reviewedToday} card
            {reviewedToday !== 1 ? "s" : ""} today.
          </p>

          <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
            <p className="text-4xl font-bold mb-1">
              {Math.round(totalScore * 100)}%
            </p>
            <p className="text-sm text-muted">Overall score</p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {(
              [
                ["wrong", "bg-red-600"],
                ["hard", "bg-orange-500"],
                ["good", "bg-blue-600"],
                ["easy", "bg-green-600"],
              ] as const
            ).map(([rating, color]) => (
              <div key={rating} className="text-center">
                <div
                  className={`${color} text-white text-lg font-bold rounded-lg py-2 mb-1`}
                >
                  {ratingCounts[rating]}
                </div>
                <p className="text-xs text-muted">
                  {SRS_RATING_LABELS[rating]}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Back to Dashboard
            </Link>
            <SrsReviewLoadMoreControls
              loadMore={loadMore}
              onLoadMore={onLoadMore}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
