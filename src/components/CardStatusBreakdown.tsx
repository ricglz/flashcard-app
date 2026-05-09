type Breakdown = {
  new: number;
  learning: number;
  review: number;
};

export default function CardStatusBreakdown({
  breakdown,
}: {
  breakdown: Breakdown;
}) {
  const total = breakdown.new + breakdown.learning + breakdown.review;

  return (
    <div>
      <h2 className="font-semibold mb-3">Card Status</h2>
      <div className="border border-edge rounded-lg p-4">
        <div className="flex rounded-lg overflow-hidden h-6 mb-3">
          {breakdown.review > 0 && (
            <div
              className="bg-green-500"
              style={{
                width: `${(breakdown.review / total) * 100}%`,
              }}
            />
          )}
          {breakdown.learning > 0 && (
            <div
              className="bg-yellow-500"
              style={{
                width: `${(breakdown.learning / total) * 100}%`,
              }}
            />
          )}
          {breakdown.new > 0 && (
            <div
              className="bg-gray-300 dark:bg-gray-600"
              style={{
                width: `${(breakdown.new / total) * 100}%`,
              }}
            />
          )}
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500" />
            Review: {breakdown.review}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-500" />
            Learning: {breakdown.learning}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" />
            New: {breakdown.new}
          </span>
        </div>
      </div>
    </div>
  );
}
