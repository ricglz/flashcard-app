type GeneratedCard = {
  fields: Record<string, string>;
  rationale?: string;
  selected: boolean;
};

export default function AiCardPreview({
  cards,
  selectedCount,
  onToggle,
  onEdit,
  onRegenerate,
}: {
  cards: GeneratedCard[];
  selectedCount: number;
  onToggle: (idx: number) => void;
  onEdit: (idx: number, key: string, value: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {selectedCount} of {cards.length} cards selected
        </p>
        <button
          onClick={onRegenerate}
          className="text-sm text-muted hover:text-foreground"
        >
          Regenerate
        </button>
      </div>
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`border rounded-lg p-3 ${card.selected ? "border-edge" : "border-edge opacity-50"}`}
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={card.selected}
              onChange={() => onToggle(idx)}
              className="mt-1"
            />
            <div className="flex-1 text-sm">
              {Object.entries(card.fields).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-muted">{key}:</span>{" "}
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onEdit(idx, key, e.target.value)}
                    className="border-b border-edge bg-transparent px-1 focus:outline-none focus:border-accent"
                  />
                </div>
              ))}
              {card.rationale && (
                <p className="text-xs text-muted mt-1 italic">{card.rationale}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
