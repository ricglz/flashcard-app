import type { ReactNode } from "react";
import type { CardRating } from "@/lib/types";
import {
  CARD_RATINGS,
  SRS_RATING_LABELS,
  CARD_RATING_SCORES,
} from "@/lib/types";
import { RouteStateShellWithHeader } from "@/components/ui/RouteStateShell";
import { StateContent } from "@/components/ui/StateContent";
import { LinkButton } from "@/components/ui/LinkButton";

export default function SrsReviewComplete({
  reviewedCount,
  ratingCounts,
  reviewedToday,
  actions,
}: {
  reviewedCount: number;
  ratingCounts: Record<CardRating, number>;
  reviewedToday: number;
  actions?: ReactNode;
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
    <RouteStateShellWithHeader backLabel="Dashboard">
      <StateContent
        title="All done!"
        description={
          <>
            You reviewed {reviewedToday} card{reviewedToday !== 1 ? "s" : ""} today.
          </>
        }
        size="lg"
        actions={
          <>
            <LinkButton href="/" variant="primary" size="lg" fullWidth>
              Back to Dashboard
            </LinkButton>
            {actions}
          </>
        }
      >
        <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
          <p className="text-4xl font-bold mb-1">{Math.round(totalScore * 100)}%</p>
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
              <div className={`${color} text-white text-lg font-bold rounded-lg py-2 mb-1`}>
                {ratingCounts[rating]}
              </div>
              <p className="text-xs text-muted">{SRS_RATING_LABELS[rating]}</p>
            </div>
          ))}
        </div>
      </StateContent>
    </RouteStateShellWithHeader>
  );
}
