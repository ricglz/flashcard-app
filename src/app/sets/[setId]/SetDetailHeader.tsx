"use client";

import Link from "next/link";

type Props = {
  setId: string;
  isMember: boolean;
  isOwner: boolean;
  aiAvailable: boolean;
  onBack: () => void;
  onAiGenerate: () => void;
};

export default function SetDetailHeader({
  setId,
  isMember,
  isOwner,
  aiAvailable,
  onBack,
  onAiGenerate,
}: Props) {
  return (
    <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
      <button
        onClick={onBack}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; Back
      </button>
      <div className="flex gap-2">
        {isOwner && aiAvailable && (
          <button
            onClick={onAiGenerate}
            className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
          >
            AI Generate
          </button>
        )}
        {isMember && (
          <Link
            href={`/study/${setId}`}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Study
          </Link>
        )}
        {isOwner && (
          <Link
            href={`/sets/${setId}/edit`}
            className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
          >
            Edit
          </Link>
        )}
      </div>
    </header>
  );
}
