import CardPreviewList, { type PreviewCard } from "@/components/CardPreviewList";

export default function AiCardPreview({
  cards,
  selectedCount,
  onToggle,
  onEdit,
  onRegenerate,
}: {
  cards: PreviewCard[];
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
      <CardPreviewList cards={cards} onToggle={onToggle} onEdit={onEdit} />
    </div>
  );
}
