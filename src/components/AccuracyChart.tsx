type DayEntry = {
  dayKey: string;
  totalCards: number;
  accuracy: number;
};

export default function AccuracyChart({ history }: { history: DayEntry[] }) {
  return (
    <div>
      <h2 className="font-semibold mb-3">Accuracy</h2>
      <div className="border border-edge rounded-lg p-4">
        <div className="flex items-end gap-1 h-24">
          {history.map((day) => {
            const heightPx = Math.max(4, day.accuracy * 80);
            return (
              <div
                key={day.dayKey}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-[10px] text-muted">
                  {day.totalCards > 0
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
