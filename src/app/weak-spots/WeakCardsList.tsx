import Link from "next/link";
import type { WeakCardsResponse, WeakReason } from "@/lib/aiToolingSchemas";
import { Badge } from "@/components/ui/Badge";

const REASON_LABELS: Record<WeakReason, string> = {
  recent_wrong_rating: "Wrong",
  recent_hard_rating: "Hard",
  low_ease_factor: "Low Ease",
  learning_status: "Learning",
  many_reviews_not_graduated: "Not Graduating",
  recently_due_again: "Due Again",
};

export default function WeakCardsList({
  weakCards,
  totalWeakCards,
  avgScore,
}: {
  weakCards: WeakCardsResponse;
  totalWeakCards: number;
  avgScore: number;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 border border-edge rounded-lg">
          <p className="text-xs text-muted">Weak Cards</p>
          <p className="text-2xl font-bold">{totalWeakCards}</p>
        </div>
        <div className="p-3 border border-edge rounded-lg">
          <p className="text-xs text-muted">Avg Score</p>
          <p className="text-2xl font-bold">{avgScore}</p>
        </div>
      </div>

      {weakCards.schemaGroups.map((group) =>
        group.sets.map((set) => (
          <div key={set.setId} className="mb-6">
            <h3 className="font-semibold mb-3">
              <Link
                href={`/sets/${set.setId}`}
                className="text-accent hover:underline"
              >
                {set.name}
              </Link>
              <span className="text-sm text-muted ml-2">
                ({set.weakCards.length} weak)
              </span>
            </h3>
            <div className="space-y-2">
              {set.weakCards.map((card) => (
                <div
                  key={card.cardId}
                  className="border border-edge rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1 text-sm leading-6">
                      {Object.entries(card.fields).map(([key, value]) => (
                        <span key={key} className="mr-3 break-words">
                          <span className="text-muted">{key}:</span> {value}
                        </span>
                      ))}
                    </div>
                    <Badge variant={scoreVariant(card.weakScore)}>
                      {Math.round(card.weakScore * 10) / 10}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {card.weakReasons.map((reason) => (
                      <Badge key={reason} variant="neutral" size="sm">
                        {REASON_LABELS[reason]}
                      </Badge>
                    ))}
                    <span className="px-1.5 py-0.5 text-xs text-muted">
                      ease: {card.metrics.easeFactor.toFixed(1)} | reviews:{" "}
                      {card.metrics.reviewCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )),
      )}
    </>
  );
}

function scoreVariant(score: number): "danger" | "warning" | "neutral" {
  if (score >= 10) return "danger";
  if (score >= 5) return "warning";
  return "neutral";
}
