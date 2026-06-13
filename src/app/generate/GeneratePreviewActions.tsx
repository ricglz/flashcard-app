"use client";

type GeneratePreviewActionsProps = {
  selectedCount: number;
  totalCount: number;
  onBack: () => void;
  onConfirm: () => void;
  locked: boolean;
  confirmAction?: string;
};

export default function GeneratePreviewActions({
  selectedCount,
  totalCount,
  onBack,
  onConfirm,
  locked,
  confirmAction = "Create Set",
}: GeneratePreviewActionsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-muted">
        {selectedCount} of {totalCount} cards included
      </p>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          disabled={locked}
          className="px-3 py-1.5 border border-edge rounded-lg text-sm hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={selectedCount === 0 || locked}
          className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
        >
          {confirmAction} ({selectedCount} cards)
        </button>
      </div>
    </div>
  );
}
