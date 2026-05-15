"use client";

type GeneratedCard = {
  fields: Record<string, string>;
  sourceCardIds?: string[];
  rationale?: string;
  selected: boolean;
};

type GeneratePreviewProps = {
  cards: GeneratedCard[];
  selectedCount: number;
  onCardsChange: (cards: GeneratedCard[]) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export default function GeneratePreview({
  cards,
  selectedCount,
  onCardsChange,
  onBack,
  onConfirm,
}: GeneratePreviewProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {selectedCount} of {cards.length} cards selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-edge rounded-lg text-sm hover:bg-surface-hover"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedCount === 0}
            className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            Create Set ({selectedCount} cards)
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-3 ${card.selected ? "border-edge" : "border-edge opacity-50"}`}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={card.selected}
                onChange={(e) => {
                  const updated = [...cards];
                  updated[idx] = { ...updated[idx]!, selected: e.target.checked };
                  onCardsChange(updated);
                }}
                className="mt-1"
              />
              <div className="flex-1 text-sm">
                {Object.entries(card.fields).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="text-muted">{key}:</span>{" "}
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const updated = [...cards];
                        updated[idx] = {
                          ...updated[idx]!,
                          fields: { ...updated[idx]!.fields, [key]: e.target.value },
                        };
                        onCardsChange(updated);
                      }}
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
    </div>
  );
}
