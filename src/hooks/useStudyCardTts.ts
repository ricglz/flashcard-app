"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TtsEvent } from "@/lib/tts";
import { cancelTts, ensureVoices, speakSequence } from "@/lib/tts";
import { isTtsProblem } from "./useTtsInteraction";
import type { RevealTtsItem } from "@/components/studyCardTts";

type Params = {
  frontItems: readonly RevealTtsItem[];
  revealItems: readonly RevealTtsItem[];
  frontKey: string;
  revealKey: string;
  autoPlay: boolean;
  rate?: number;
};

export function useStudyCardTts({ frontItems, revealItems, frontKey, revealKey, autoPlay, rate }: Params) {
  const [activeByKey, setActiveByKey] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [lastSpokenKey, setLastSpokenKey] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const rateRef = useRef(rate);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const handleTtsEventForKey = useCallback((key: string) => {
    return (event: TtsEvent) => {
      if (event.status === "speaking") {
        setActiveByKey((prev) => ({ ...prev, [key]: event.itemId ?? null }));
        setLastSpokenKey(key);
        setMessage(null);
        return;
      }
      if (event.status === "preparing" || event.status === "queued") {
        setMessage(null);
        return;
      }
      setActiveByKey((prev) => ({ ...prev, [key]: null }));
      if (isTtsProblem(event.status)) {
        setMessage("message" in event ? event.message : "Couldn't play audio. Check volume or tap again.");
      } else {
        setMessage(null);
      }
    };
  }, []);

  // Derive visible active field from current playback key and autoplay state to avoid setState in effect for clearing stale highlight
  const derivedActiveFieldId = (() => {
    if (!autoPlay) return null;
    if (lastSpokenKey === frontKey) return activeByKey[frontKey] ?? null;
    if (lastSpokenKey === revealKey) return activeByKey[revealKey] ?? null;
    return null;
  })();

  // Cleanup effect for autoplay toggle off – separate from front autoplay to avoid coupling front playback to reveal key changes
  useEffect(() => {
    if (autoPlay) return;
    runIdRef.current += 1;
    cancelTts();
    // Clear active map entry to prevent stale highlight when re-enabling autoplay on same card
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize UI state to prop change to prevent stale TTS highlight; derived visible state depends on cleared map
    setActiveByKey((prev) => {
      const next = { ...prev };
      delete next[frontKey];
      delete next[revealKey];
      return next;
    });
    setLastSpokenKey(null);
  }, [autoPlay, frontKey, revealKey]);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }
    if (frontItems.length === 0) {
      runIdRef.current += 1;
      cancelTts();
      return;
    }
    runIdRef.current += 1;
    const currentRun = runIdRef.current;
    const currentKey = frontKey;
    let cancelled = false;
    void ensureVoices().then(() => {
      if (cancelled) return;
      if (runIdRef.current !== currentRun) return;
      void speakSequence([...frontItems], {
        rate: rateRef.current,
        onEvent: (e) => {
          if (runIdRef.current !== currentRun) return;
          handleTtsEventForKey(currentKey)(e);
        },
      });
    });
    return () => {
      cancelled = true;
      runIdRef.current += 1;
      cancelTts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frontKey models replay when playable content changes explicitly; frontItems is derived from same inputs and would cause unnecessary replays on array reference changes. rate is accessed via ref to avoid replay on speed slider change.
  }, [autoPlay, frontKey, handleTtsEventForKey]);

  const playRevealTts = useCallback(() => {
    if (!autoPlay) return;
    if (revealItems.length === 0) return;
    runIdRef.current += 1;
    const currentRun = runIdRef.current;
    const currentKey = revealKey;
    // clear derived active immediately via state update in event handler context (allowed)
    setActiveByKey((prev) => ({ ...prev, [currentKey]: null }));
    setLastSpokenKey(currentKey);
    void speakSequence([...revealItems], {
      rate: rateRef.current,
      onEvent: (e) => {
        if (runIdRef.current !== currentRun) return;
        handleTtsEventForKey(currentKey)(e);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealKey models content change explicitly; revealItems array reference would cause unnecessary recreation, rate accessed via ref
  }, [autoPlay, revealKey, handleTtsEventForKey]);

  const handleTtsEvent = useCallback(
    (event: TtsEvent) => {
      // generic handler for manual TtsButton clicks, not tied to specific key; use a generic key
      handleTtsEventForKey("manual")(event);
    },
    [handleTtsEventForKey],
  );

  return {
    activeFieldId: derivedActiveFieldId,
    message,
    handleTtsEvent,
    playRevealTts,
  };
}
