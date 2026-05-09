type Props = {
  cardLimit: number | null;
  onCardLimitChange: (limit: number | null) => void;
  totalCards: number;
};

export default function CardLimitSelector({
  cardLimit,
  onCardLimitChange,
  totalCards,
}: Props) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-sm">Cards to study</h2>
      <div className="flex gap-2">
        {[10, 20, 50].map((n) => (
          <button
            key={n}
            onClick={() => onCardLimitChange(n)}
            disabled={totalCards < n}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cardLimit === n
                ? "bg-accent text-white"
                : "border border-edge hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onCardLimitChange(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            cardLimit === null
              ? "bg-accent text-white"
              : "border border-edge hover:bg-surface-hover"
          }`}
        >
          All
        </button>
      </div>
    </div>
  );
}
