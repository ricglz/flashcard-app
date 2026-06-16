"use client";

type Props = {
  setName: string;
  onClose: () => void;
};

export default function AssistantPanelSkeleton({ setName, onClose }: Props) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-96 lg:w-[28rem] max-w-[calc(100vw-2rem)] h-[32rem] lg:h-[36rem] max-h-[calc(100vh-2rem)] bg-background border border-edge rounded-xl shadow-xl flex flex-col"
      role="status"
      aria-label="Loading study assistant"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-edge">
        <h3 className="font-semibold text-sm lg:text-base">Study Assistant</h3>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground text-lg leading-none"
          aria-label="Close assistant"
        >
          &times;
        </button>
      </div>

      <div className="px-3 py-2 border-b border-edge flex gap-2 items-center">
        <span className="text-xs text-muted truncate flex-1">{setName}</span>
        <div className="h-7 w-36 rounded-lg bg-surface-hover animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden p-3 space-y-3">
        <div className="mx-auto mt-8 h-4 w-48 rounded bg-surface-hover animate-pulse" />
        <div className="space-y-2 pt-6">
          <div className="h-10 w-4/5 rounded-lg bg-surface-hover animate-pulse" />
          <div className="ml-auto h-10 w-2/3 rounded-lg bg-surface-hover animate-pulse" />
          <div className="h-16 w-5/6 rounded-lg bg-surface-hover animate-pulse" />
        </div>
      </div>

      <div className="p-3 border-t border-edge">
        <div className="flex gap-2 items-end">
          <div className="h-10 flex-1 rounded-lg border border-edge bg-surface-hover animate-pulse" />
          <div className="h-10 w-16 rounded-lg bg-surface-hover animate-pulse" />
        </div>
      </div>
    </div>
  );
}
