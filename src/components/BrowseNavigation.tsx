"use client";

type Props = {
  onPrev: () => void;
  onNext: () => void;
  onDismiss: () => void;
  canPrev: boolean;
  canNext: boolean;
};

export default function BrowseNavigation({
  onPrev,
  onNext,
  onDismiss,
  canPrev,
  canNext,
}: Props) {
  return (
    <div className="flex gap-3 justify-center mt-8">
      <button
        onClick={onPrev}
        disabled={!canPrev}
        className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        &larr; Prev
      </button>
      <button
        onClick={onDismiss}
        className="px-5 py-2 bg-raised border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
      >
        Know it
      </button>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="px-5 py-2 border border-edge rounded-lg text-sm font-medium hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next &rarr;
      </button>
    </div>
  );
}
