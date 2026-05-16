import Link from "next/link";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";

export default function SrsReviewHeader({
  reviewedCount,
  totalCards,
  ttsSpeed,
  onTtsSpeedChange,
  ttsEnabled,
  onToggleTts,
  onEndSession,
}: {
  reviewedCount: number;
  totalCards: number;
  ttsSpeed: number;
  onTtsSpeedChange: (speed: number) => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onEndSession: () => void;
}) {
  return (
    <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Dashboard
        </Link>
        <span className="text-sm text-muted">
          {reviewedCount + 1} / {totalCards}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <TtsSpeedControl speed={ttsSpeed} onSpeedChange={onTtsSpeedChange} />
        <button
          onClick={onToggleTts}
          className="text-sm text-muted hover:text-foreground transition-colors"
          title={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          aria-label={ttsEnabled ? "Mute TTS" : "Unmute TTS"}
        >
          <SpeakerIcon muted={!ttsEnabled} />
        </button>
        <button
          onClick={onEndSession}
          className="text-sm text-danger hover:text-danger-hover transition-colors"
        >
          End Session
        </button>
      </div>
    </header>
  );
}
