import MarkdownContent from "./MarkdownContent";
import { sortedEntries } from "@/lib/objects";
import { countTokenAnnotations } from "@/lib/tokenAnnotations";
import type { TokenAnnotations } from "@/lib/types";
import { Badge } from "./ui/Badge";

export type PreviewCard = {
  fields: Record<string, string>;
  tokenAnnotations?: TokenAnnotations;
  rationale?: string;
  selected: boolean;
};

export default function CardPreviewList({
  cards,
  onToggle,
  onEdit,
  disabled,
}: {
  cards: PreviewCard[];
  onToggle: (idx: number) => void;
  onEdit: (idx: number, key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`border rounded-lg p-3 ${card.selected ? "border-edge" : "border-edge opacity-50"}`}
        >
          <div className="flex flex-wrap items-start gap-2">
            <label className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={card.selected}
                onChange={() => onToggle(idx)}
                disabled={disabled}
                aria-label={`Include card ${idx + 1} in set`}
                className="disabled:opacity-50"
              />
              Include
            </label>
            <div className="min-w-0 flex-1 text-sm">
              {sortedEntries(card.fields).map(([key, value]) => (
                <div
                  key={key}
                  className="mb-1 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1"
                >
                  <span className="min-w-0 text-muted break-words">
                    {key}:
                  </span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onEdit(idx, key, e.target.value)}
                    disabled={disabled}
                    className="min-w-0 w-full sm:w-auto sm:flex-1 border-b border-edge bg-transparent px-1 focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              ))}
              {card.rationale && (
                <div className="min-w-0 text-xs text-muted mt-1 italic break-words">
                  <MarkdownContent compact>{card.rationale}</MarkdownContent>
                </div>
              )}
              {countTokenAnnotations(card.tokenAnnotations) > 0 && (
                <Badge variant="info" size="sm" className="mt-1">
                  {countTokenAnnotations(card.tokenAnnotations)} annotations
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
