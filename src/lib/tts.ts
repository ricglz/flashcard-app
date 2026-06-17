export type TtsStatus =
  | "idle"
  | "preparing"
  | "queued"
  | "speaking"
  | "ended"
  | "cancelled"
  | "unsupported"
  | "timeout"
  | "error";

export type TtsProblemStatus = "unsupported" | "timeout" | "error";

export type TtsFailureKind =
  | "unsupported_browser"
  | "permission_blocked"
  | "language_unavailable"
  | "voice_unavailable"
  | "audio_hardware"
  | "network"
  | "synthesis_unavailable"
  | "synthesis_failed"
  | "timeout"
  | "unknown";

type TtsEventBase = {
  text?: string;
  lang?: string;
  voiceName?: string;
  voiceLang?: string;
};

type TtsProgressEvent = TtsEventBase & {
  status: "preparing" | "queued" | "speaking" | "ended";
};

type TtsCancelledEvent = TtsEventBase & {
  status: "cancelled";
  kind: TtsFailureKind;
  message: string;
};

type TtsFailureEvent = TtsEventBase & {
  status: TtsProblemStatus;
  kind: TtsFailureKind;
  message: string;
};

export type TtsEvent =
  | TtsProgressEvent
  | TtsCancelledEvent
  | TtsFailureEvent;

export type TtsResult =
  | {
      ok: true;
      status: "ended" | "cancelled";
      voiceName?: string;
      voiceLang?: string;
    }
  | {
      ok: false;
      status: "unsupported" | "timeout" | "error";
      kind: TtsFailureKind;
      message: string;
      voiceName?: string;
      voiceLang?: string;
    };

export type SpeakOptions = {
  rate?: number;
  onEvent?: (event: TtsEvent) => void;
  startTimeoutMs?: number;
};

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  return isTtsSupported() ? window.speechSynthesis : null;
}

export function readVoices(): SpeechSynthesisVoice[] {
  const synth = getSpeechSynthesis();
  if (!synth) return [];
  const voices = synth.getVoices();
  if (voices.length > 0) cachedVoices = voices;
  return voices;
}

/** Ensure voices are loaded (they load async in some browsers). */
function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  const currentVoices = readVoices();
  if (currentVoices.length > 0) return Promise.resolve(currentVoices);
  if (voicesLoadPromise) return voicesLoadPromise;

  voicesLoadPromise = new Promise((resolve) => {
    const synth = getSpeechSynthesis();
    if (!synth) {
      resolve([]);
      return;
    }

    const finish = () => {
      const voices = readVoices();
      resolve(voices);
      voicesLoadPromise = null;
    };

    const timeout = window.setTimeout(finish, 1500);
    const handler = () => {
      window.clearTimeout(timeout);
      finish();
    };

    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", handler, { once: true });
    } else {
      const previousHandler = synth.onvoiceschanged;
      synth.onvoiceschanged = (event) => {
        previousHandler?.call(synth, event);
        handler();
      };
    }
  });

  return voicesLoadPromise;
}

/** Kick off voice loading without delaying a user-gesture speech call. */
export function preloadTtsVoices(): void {
  if (!isTtsSupported()) return;
  void ensureVoices();
}

export function cancelTts(): void {
  const synth = getSpeechSynthesis();
  synth?.cancel();
}

export function voiceScore(voice: SpeechSynthesisVoice, lang: string): number {
  const prefix = lang.split("-")[0] ?? lang;
  let score = 0;

  if (voice.lang === lang) score += 100;
  else if (voice.lang.toLowerCase() === lang.toLowerCase()) score += 90;
  else if (voice.lang.startsWith(prefix)) score += 60;

  if (/enhanced|premium/i.test(voice.name)) score += 20;
  if (typeof navigator !== "undefined" && navigator.onLine && !voice.localService) {
    score += 10;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine && voice.localService) {
    score += 10;
  }
  if (voice.default) score += 1;

  return score;
}

export function pickCachedVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length > 0 ? cachedVoices : readVoices();
  const normalizedLang = lang.toLowerCase();
  const prefix = normalizedLang.split("-")[0] ?? normalizedLang;
  const candidates = voices.filter(
    (voice) => {
      const voiceLang = voice.lang.toLowerCase();
      return voiceLang === normalizedLang || voiceLang.startsWith(prefix);
    },
  );

  return candidates.sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
}

export function friendlySpeechError(error: SpeechSynthesisErrorCode | undefined, lang: string): { kind: TtsFailureKind; message: string } {
  switch (error) {
    case "not-allowed":
      return { kind: "permission_blocked", message: "Your browser blocked audio. Tap the speaker button again." };
    case "language-unavailable":
      return { kind: "language_unavailable", message: `No voice is available for ${lang} on this device.` };
    case "voice-unavailable":
      return { kind: "voice_unavailable", message: "The selected voice is unavailable. Trying again may use the browser default." };
    case "audio-hardware":
      return { kind: "audio_hardware", message: "Your device could not play audio. Check volume, Bluetooth, and silent mode." };
    case "network":
      return { kind: "network", message: "A network voice could not be loaded. Try again or install an offline voice." };
    case "synthesis-unavailable":
      return { kind: "synthesis_unavailable", message: "Text-to-speech is unavailable in this browser." };
    case "synthesis-failed":
      return { kind: "synthesis_failed", message: "Text-to-speech failed. Try again or use another browser." };
    case "canceled":
    case "interrupted":
      return { kind: "unknown", message: "Speech was interrupted." };
    case "audio-busy":
      return { kind: "audio_hardware", message: "Audio output is busy. Close other audio apps and try again." };
    case "invalid-argument":
      return { kind: "synthesis_failed", message: "Invalid speech request. Try again with different text." };
    case "text-too-long":
      return { kind: "synthesis_failed", message: "Text is too long for speech synthesis. Try a shorter passage." };
    case undefined:
    default:
      return { kind: "unknown", message: "Couldn’t play audio. Check volume, silent mode, or browser permissions." };
  }
}

export function timeoutMessage(): string {
  return "Audio was requested, but playback did not start. Check volume or tap again.";
}

/**
 * Speak the given text using Web Speech API.
 * Calls speechSynthesis.speak without awaiting voice loading so mobile browsers
 * are more likely to treat it as part of the user's tap/click gesture.
 */
export function speak(
  text: string,
  lang: string,
  options: SpeakOptions = {},
): Promise<TtsResult> {
  const synth = getSpeechSynthesis();
  const trimmedText = text.trim();

  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    const message = "Text-to-speech is not supported in this browser.";
    const kind: TtsFailureKind = "unsupported_browser";
    options.onEvent?.({ status: "unsupported", text, lang, message, kind });
    return Promise.resolve({ ok: false, status: "unsupported", kind, message });
  }

  if (!trimmedText) {
    return Promise.resolve({ ok: true, status: "ended" });
  }

  options.onEvent?.({ status: "preparing", text: trimmedText, lang });
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmedText);
  utterance.lang = lang;
  utterance.rate = options.rate ?? 0.75;

  const voice = pickCachedVoice(lang);
  if (voice) utterance.voice = voice;

  return new Promise((resolve) => {
    let started = false;
    let settled = false;

    const finish = (result: TtsResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result);
    };

    const timeout = window.setTimeout(() => {
      if (started || settled) return;
      const message = timeoutMessage();
      const kind: TtsFailureKind = "timeout";
      options.onEvent?.({
        status: "timeout",
        text: trimmedText,
        lang,
        message,
        kind,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });
      finish({
        ok: false,
        status: "timeout",
        kind,
        message,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });
    }, options.startTimeoutMs ?? 2500);

    utterance.onstart = () => {
      started = true;
      options.onEvent?.({
        status: "speaking",
        text: trimmedText,
        lang,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });
    };

    utterance.onend = () => {
      options.onEvent?.({
        status: "ended",
        text: trimmedText,
        lang,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });
      finish({
        ok: true,
        status: "ended",
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });
    };

    utterance.onerror = (event) => {
      const { kind, message } = friendlySpeechError(event.error, lang);
      const status = event.error === "canceled" || event.error === "interrupted"
        ? "cancelled"
        : "error";

      options.onEvent?.({
        status,
        text: trimmedText,
        lang,
        message,
        kind,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });

      if (status === "cancelled") {
        finish({
          ok: true,
          status: "cancelled",
          voiceName: voice?.name,
          voiceLang: voice?.lang,
        });
      } else {
        finish({
          ok: false,
          status: "error",
          kind,
          message,
          voiceName: voice?.name,
          voiceLang: voice?.lang,
        });
      }
    };

    options.onEvent?.({
      status: "queued",
      text: trimmedText,
      lang,
      voiceName: voice?.name,
      voiceLang: voice?.lang,
    });

    try {
      synth.speak(utterance);
    } catch {
      const message = "Couldn’t start text-to-speech in this browser.";
      options.onEvent?.({ status: "error", text: trimmedText, lang, message, kind: "unknown" });
      finish({ ok: false, status: "error", kind: "unknown", message });
      return;
    }

    preloadTtsVoices();
  });
}

/**
 * Speak multiple texts sequentially, each with its own language.
 * Cancels any ongoing speech before starting and queues all utterances at once
 * for better mobile user-gesture compatibility.
 */
export function speakSequence(
  items: { text: string; lang: string }[],
  rateOrOptions: number | SpeakOptions = 0.75,
): Promise<TtsResult> {
  const options = typeof rateOrOptions === "number" ? { rate: rateOrOptions } : rateOrOptions;
  const synth = getSpeechSynthesis();
  const speakableItems = items
    .map((item) => ({ ...item, text: item.text.trim() }))
    .filter((item) => item.text.length > 0);

  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    const message = "Text-to-speech is not supported in this browser.";
    options.onEvent?.({ status: "unsupported", message, kind: "unsupported_browser" });
    return Promise.resolve({ ok: false, status: "unsupported", kind: "unsupported_browser" as const, message });
  }

  if (speakableItems.length === 0) {
    return Promise.resolve({ ok: true, status: "ended" });
  }

  options.onEvent?.({ status: "preparing" });
  synth.cancel();

  return new Promise((resolve) => {
    let started = false;
    let settled = false;
    let remaining = speakableItems.length;
    let lastVoice: SpeechSynthesisVoice | undefined;

    const finish = (result: TtsResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result);
    };

    const timeout = window.setTimeout(() => {
      if (started || settled) return;
      const message = timeoutMessage();
      options.onEvent?.({
        status: "timeout",
        message,
        kind: "timeout",
        voiceName: lastVoice?.name,
        voiceLang: lastVoice?.lang,
      });
      finish({
        ok: false,
        status: "timeout",
        kind: "timeout",
        message,
        voiceName: lastVoice?.name,
        voiceLang: lastVoice?.lang,
      });
    }, options.startTimeoutMs ?? 2500);

    for (const item of speakableItems) {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = item.lang;
      utterance.rate = options.rate ?? 0.75;

      const voice = pickCachedVoice(item.lang);
      if (voice) {
        utterance.voice = voice;
        lastVoice = voice;
      }

      utterance.onstart = () => {
        started = true;
        options.onEvent?.({
          status: "speaking",
          text: item.text,
          lang: item.lang,
          voiceName: voice?.name,
          voiceLang: voice?.lang,
        });
      };

      utterance.onend = () => {
        remaining -= 1;
        if (remaining === 0) {
          options.onEvent?.({
            status: "ended",
            text: item.text,
            lang: item.lang,
            voiceName: voice?.name,
            voiceLang: voice?.lang,
          });
          finish({
            ok: true,
            status: "ended",
            voiceName: voice?.name,
            voiceLang: voice?.lang,
          });
        }
      };

      utterance.onerror = (event) => {
        remaining -= 1;
        const { kind, message } = friendlySpeechError(event.error, item.lang);
        const status = event.error === "canceled" || event.error === "interrupted"
          ? "cancelled"
          : "error";

        options.onEvent?.({
          status,
          text: item.text,
          lang: item.lang,
          message,
          kind,
          voiceName: voice?.name,
          voiceLang: voice?.lang,
        });

        if (status !== "cancelled") {
          finish({
            ok: false,
            status: "error",
            kind,
            message,
            voiceName: voice?.name,
            voiceLang: voice?.lang,
          });
        } else if (remaining === 0) {
          finish({
            ok: true,
            status: "cancelled",
            voiceName: voice?.name,
            voiceLang: voice?.lang,
          });
        }
      };

      options.onEvent?.({
        status: "queued",
        text: item.text,
        lang: item.lang,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });

      try {
        synth.speak(utterance);
      } catch {
        const message = "Couldn’t start text-to-speech in this browser.";
        options.onEvent?.({ status: "error", text: item.text, lang: item.lang, message, kind: "unknown" });
        finish({ ok: false, status: "error", kind: "unknown", message });
        return;
      }
    }

    preloadTtsVoices();
  });
}

export async function getAvailableVoices(
  lang: string,
): Promise<SpeechSynthesisVoice[]> {
  if (!isTtsSupported()) return [];
  const voices = await ensureVoices();
  const prefix = lang.split("-")[0] ?? lang;
  return voices.filter(
    (voice) => voice.lang === lang || voice.lang.startsWith(prefix),
  );
}

preloadTtsVoices();
