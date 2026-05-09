type DayEntry = {
  dayKey: string;
  totalCards: number;
};

type Props = {
  history: DayEntry[];
  maxCards: number;
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
};

export default function DailyActivityChart({
  history,
  maxCards,
  days,
  onDaysChange,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Daily Activity</h2>
        <div className="flex gap-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                days === d
                  ? "bg-accent text-white"
                  : "border border-edge hover:bg-surface-hover"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="h-40 flex items-center justify-center border border-edge rounded-lg">
          <p className="text-sm text-muted">
            No activity yet. Start reviewing to see your stats!
          </p>
        </div>
      ) : (
        <div className="border border-edge rounded-lg p-4">
          <div className="flex items-end gap-1 h-32">
            {history.map((day) => {
              const heightPx =
                maxCards > 0
                  ? Math.max(4, (day.totalCards / maxCards) * 112)
                  : 4;
              const label = day.dayKey.slice(5);
              return (
                <div
                  key={day.dayKey}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-muted">
                    {day.totalCards > 0 ? day.totalCards : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-accent transition-all"
                    style={{ height: `${heightPx}px` }}
                  />
                  <span className="text-[9px] text-muted">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
