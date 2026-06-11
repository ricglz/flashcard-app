export default function SrsReviewLoadMoreButton({
  onLoadMore,
  label,
  disabled = false,
}: {
  onLoadMore: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onLoadMore}
      disabled={disabled}
      className="px-6 py-3 text-sm font-medium border border-edge text-foreground rounded-lg hover:bg-raised transition-colors disabled:opacity-50"
    >
      {label}
    </button>
  );
}
