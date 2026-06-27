"use client";

import AssistantPanelHeader from "./AssistantPanelHeader";

type Props = {
  setName: string;
  onClose: () => void;
};

export default function AssistantPanelSkeleton({ setName, onClose }: Props) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 w-full h-[60dvh] max-h-[70dvh] bg-background border-t sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-96 sm:max-w-[calc(100vw-2rem)] sm:h-[32rem] sm:max-h-[calc(100dvh-2rem)] sm:border border-edge rounded-t-xl sm:rounded-xl shadow-xl flex flex-col lg:w-[28rem] lg:h-[36rem]"
      role="status"
      aria-label="Loading study assistant"
    >
      <AssistantPanelHeader onClose={onClose} onClear={() => {}} />

      <div className="px-3 py-2 border-b border-edge flex gap-2 items-center">
        <span className="text-xs text-muted truncate flex-1">{setName}</span>
        <div className="h-7 w-36 rounded-lg bg-surface-hover animate-pulse" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3 space-y-3">
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
