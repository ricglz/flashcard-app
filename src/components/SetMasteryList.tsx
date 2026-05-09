type SetMasteryEntry = {
  setId: string;
  setName: string;
  total: number;
  new: number;
  learning: number;
  review: number;
};

export default function SetMasteryList({
  mastery,
}: {
  mastery: SetMasteryEntry[];
}) {
  return (
    <div>
      <h2 className="font-semibold mb-3">Set Mastery</h2>
      <div className="space-y-3">
        {mastery.map((s) => {
          const pct =
            s.total > 0 ? Math.round((s.review / s.total) * 100) : 0;
          return (
            <div key={s.setId} className="border border-edge rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{s.setName}</span>
                <span className="text-xs text-muted">{pct}% mastered</span>
              </div>
              <div className="h-2 bg-raised rounded-full overflow-hidden flex">
                {s.review > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(s.review / s.total) * 100}%` }}
                  />
                )}
                {s.learning > 0 && (
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${(s.learning / s.total) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-muted">
                <span>{s.review} review</span>
                <span>{s.learning} learning</span>
                <span>{s.new} new</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
