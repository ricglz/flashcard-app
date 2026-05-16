"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";
import type { useTtsControls } from "@/hooks/useTtsControls";

type StudyLayoutProps = {
  progress: { current: number; total: number; dismissed?: number };
  tts: ReturnType<typeof useTtsControls>;
  actionButton?: { label: string; onClick: () => void };
  children: ReactNode;
  assistant?: ReactNode;
};

export default function StudyLayout({
  progress,
  tts,
  actionButton,
  children,
  assistant,
}: StudyLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Back
          </button>
          <span className="text-sm text-muted">
            {progress.current + 1} / {progress.total}
            {progress.dismissed !== undefined && progress.dismissed > 0 && (
              <span className="ml-2">({progress.dismissed} dismissed)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TtsSpeedControl speed={tts.speed} onSpeedChange={tts.onSpeedChange} />
          <button
            onClick={tts.onToggle}
            className="text-sm text-muted hover:text-foreground transition-colors"
            title={tts.ttsEnabled ? "Mute TTS" : "Unmute TTS"}
            aria-label={tts.ttsEnabled ? "Mute TTS" : "Unmute TTS"}
          >
            <SpeakerIcon muted={!tts.ttsEnabled} />
          </button>
          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className="text-sm text-danger hover:text-danger-hover transition-colors"
            >
              {actionButton.label}
            </button>
          )}
        </div>
      </header>

      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(progress.current / progress.total) * 100}%`,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        {children}
      </main>

      {assistant}
    </div>
  );
}
