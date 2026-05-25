"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TtsEvent, TtsStatus } from "@/lib/tts";

export function isTtsBusy(status: TtsStatus): boolean {
  return status === "preparing" || status === "queued" || status === "speaking";
}

export function isTtsProblem(status: TtsStatus): boolean {
  return status === "unsupported" || status === "timeout" || status === "error";
}

function isTerminalStatus(status: TtsStatus): boolean {
  return status === "ended" || status === "cancelled";
}

export function useTtsInteraction({
  onTtsEvent,
  terminalResetMs = 700,
  problemResetMs,
}: {
  onTtsEvent?: (event: TtsEvent) => void;
  terminalResetMs?: number;
  problemResetMs?: number;
} = {}) {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearResetTimeout = useCallback(() => {
    clearTimeout(resetTimeoutRef.current);
  }, []);

  const resetToIdle = useCallback(
    (delayMs: number) => {
      clearResetTimeout();
      resetTimeoutRef.current = setTimeout(() => setStatus("idle"), delayMs);
    },
    [clearResetTimeout],
  );

  const clearMessage = useCallback(() => setMessage(null), []);

  const handleTtsEvent = useCallback(
    (event: TtsEvent) => {
      setStatus(event.status);
      if (event.message) setMessage(event.message);
      if (!isTtsProblem(event.status) && !event.message) setMessage(null);
      onTtsEvent?.(event);

      if (isTerminalStatus(event.status)) {
        resetToIdle(terminalResetMs);
      } else if (isTtsProblem(event.status) && problemResetMs !== undefined) {
        resetToIdle(problemResetMs);
      }
    },
    [onTtsEvent, problemResetMs, resetToIdle, terminalResetMs],
  );

  useEffect(() => clearResetTimeout, [clearResetTimeout]);

  return {
    status,
    message,
    setStatus,
    setMessage,
    clearMessage,
    handleTtsEvent,
  };
}
