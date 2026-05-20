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
}: {
  cards: PreviewCard[];
  onToggle: (idx: number) => void;
  onEdit: (idx: number, key: string, value: string) => void;
}) {
  return (
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
