export default function SourceCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 border-2 rounded-lg text-left transition-colors ${
        selected
          ? "border-accent bg-info-surface"
          : "border-edge hover:border-muted"
      }`}
    >
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted mt-1">{description}</p>
    </button>
  );
}
