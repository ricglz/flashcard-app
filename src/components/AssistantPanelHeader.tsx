"use client";

type Props = {
  onClose: () => void;
  onClear: () => void;
};

export default function AssistantPanelHeader({ onClose, onClear }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-edge">
      <h3 className="font-semibold text-sm lg:text-base">Study Assistant</h3>
      <div className="flex items-center gap-3 sm:gap-2">
        <button
          onClick={onClear}
          className="text-xs text-muted hover:text-foreground px-1 py-1"
        >
          Clear
        </button>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground text-2xl sm:text-lg leading-none w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center -mr-2 rounded-lg"
          aria-label="Close assistant"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
