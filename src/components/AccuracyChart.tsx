type DayEntry = {
  dayKey: string;
  totalCards: number;
  accuracy: number;
};

export default function AccuracyChart({ history }: { history: DayEntry[] }) {
  const isDense = history.length > 14;

  return (
    <div>
      <h2 className="font-semibold mb-3">Accuracy</h2>
      <div className="border border-edge rounded-lg p-4 overflow-hidden">
        <div
          className="grid items-end gap-1 h-24 min-w-0"
          role="list"
          aria-label="Accuracy by day"
          style={{
            gridTemplateColumns: `repeat(${history.length}, minmax(0, 1fr))`,
          }}
        >
          {history.map((day, index) => {
            const heightPx = Math.max(4, day.accuracy * 80);
            const showDenseLabel =
              !isDense ||
              index === 0 ||
              index === history.length - 1 ||
              index % 5 === 0;
            return (
              <div
                key={day.dayKey}
                className="min-w-0 flex flex-col items-center gap-1"
                role="listitem"
                aria-label={`${day.dayKey.slice(5)}: ${Math.round(day.accuracy * 100)}% accuracy`}
              >
                <span className="h-3 text-[9px] sm:text-[10px] leading-3 text-muted tabular-nums whitespace-nowrap">
                  {day.totalCards > 0 && showDenseLabel
                    ? `${Math.round(day.accuracy * 100)}%`
                    : ""}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${
                    day.accuracy >= 0.8
                      ? "bg-green-500"
                      : day.accuracy >= 0.5
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ height: `${heightPx}px` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
