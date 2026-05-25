import MarkdownContent from "./MarkdownContent";

export type PreviewCard = {
  fields: Record<string, string>;
  rationale?: string;
  selected: boolean;
};

export default function CardPreviewList({
  cards,
  onToggle,
  onEdit,
  disabled = false,
}: {
  cards: PreviewCard[];
  onToggle: (idx: number) => void;
  onEdit: (idx: number, key: string, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`border rounded-lg p-3 ${card.selected ? "border-edge" : "border-edge opacity-50"}`}
        >
          <div className="flex items-start gap-2">
            <label className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
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
            <div className="flex-1 text-sm">
              {Object.entries(card.fields).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-muted">{key}:</span>{" "}
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onEdit(idx, key, e.target.value)}
                    disabled={disabled}
                    className="border-b border-edge bg-transparent px-1 focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                </div>
              ))}
              {card.rationale && (
                <div className="text-xs text-muted mt-1 italic">
                  <MarkdownContent compact>{card.rationale}</MarkdownContent>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
