import Link from "next/link";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";

export default function BrowseHeader({
  setId,
  currentIndex,
  totalCards,
  dismissedCount,
  ttsSpeed,
  onTtsSpeedChange,
  ttsEnabled,
  onToggleTts,
}: {
  setId: string;
  currentIndex: number;
  totalCards: number;
  dismissedCount: number;
  ttsSpeed: number;
  onTtsSpeedChange: (speed: number) => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
}) {
  return (
    <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
      <Link
        href={`/study/${setId}?mode=browse`}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; Back
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">
          {currentIndex + 1} / {totalCards}
          {dismissedCount > 0 && (
            <span className="ml-2">({dismissedCount} dismissed)</span>
          )}
        </span>
        <TtsSpeedControl speed={ttsSpeed} onSpeedChange={onTtsSpeedChange} />
        <button
          onClick={onToggleTts}
          className="text-sm text-muted hover:text-foreground transition-colors"
          title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          aria-label={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
        >
          <SpeakerIcon muted={!ttsEnabled} />
        </button>
      </div>
    </header>
  );
}
