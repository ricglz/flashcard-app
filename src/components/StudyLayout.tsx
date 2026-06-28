"use client";

import type { ReactNode } from "react";
import SpeakerIcon from "@/components/SpeakerIcon";
import TtsSpeedControl from "@/components/TtsSpeedControl";
import { Alert } from "@/components/ui/Alert";
import type { useTtsControls } from "@/hooks/useTtsControls";
import { AssistantPanelProvider } from "@/contexts/AssistantPanelContext";
import { PageHeader } from "@/components/ui/PageHeader";

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
  return (
    <AssistantPanelProvider>
      <div className="min-h-screen flex flex-col">
      <PageHeader
        backLabel="Back"
        leftExtra={
          <span className="text-sm text-muted">
            {progress.current + 1} / {progress.total}
            {progress.dismissed !== undefined && progress.dismissed > 0 && (
              <span className="ml-2">({progress.dismissed} dismissed)</span>
            )}
          </span>
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${(progress.current / progress.total) * 100}%`,
          }}
        />
      </div>

      {tts.errorMessage && (
        <div className="px-4 sm:px-6 pt-4">
          <Alert variant="danger">{tts.errorMessage}</Alert>
        </div>
      )}

      <main className="min-h-0 flex-1 flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full my-auto flex flex-col items-center">
          {children}
        </div>
      </main>

      {assistant}
    </div>
    </AssistantPanelProvider>
  );
}
