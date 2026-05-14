"use client";

import Link from "next/link";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";

type SessionHeaderProps = {
  setId: string;
  effectiveIndex: number;
  cardCount: number;
  effectiveTtsSpeed: number;
  ttsEnabled: boolean;
  onTtsSpeedChange: (speed: number) => void;
  onToggleTts: () => void;
  onAbandon: () => void;
};

export default function SessionHeader({
  setId,
  effectiveIndex,
  cardCount,
  effectiveTtsSpeed,
  ttsEnabled,
  onTtsSpeedChange,
  onToggleTts,
  onAbandon,
}: SessionHeaderProps) {
  return (
    <>
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/study/${setId}`}
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Back
          </Link>
          <span className="text-sm text-muted">
            {effectiveIndex + 1} / {cardCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TtsSpeedControl speed={effectiveTtsSpeed} onSpeedChange={onTtsSpeedChange} />
          <button
            onClick={onToggleTts}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
            aria-label={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            <SpeakerIcon muted={!ttsEnabled} />
          </button>
          <button
            onClick={onAbandon}
            className="text-sm text-danger hover:text-danger-hover transition-colors"
          >
            Abandon
          </button>
        </div>
      </header>

      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(effectiveIndex / cardCount) * 100}%`,
          }}
        />
      </div>
    </>
  );
}
