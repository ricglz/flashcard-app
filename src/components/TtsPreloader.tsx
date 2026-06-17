"use client";

import { useEffect } from "react";
import { preloadTtsVoices } from "@/lib/tts";

export default function TtsPreloader() {
  useEffect(() => {
    preloadTtsVoices();

    const handleInteraction = () => {
      preloadTtsVoices();
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };

    window.addEventListener("pointerdown", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        preloadTtsVoices();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
