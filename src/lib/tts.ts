/**
 * Web Speech API wrapper for text-to-speech.
 * TTS config is derived from FieldMetadata — see types.ts.
 */

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

export type TtsEvent = {
  status: TtsStatus;
  text?: string;
  lang?: string;
  message?: string;
  voiceName?: string;
  voiceLang?: string;
};

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

/** Check if the browser supports speech synthesis. */
export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  return isTtsSupported() ? window.speechSynthesis : null;
}

function readVoices(): SpeechSynthesisVoice[] {
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

function voiceScore(voice: SpeechSynthesisVoice, lang: string): number {
  const prefix = lang.split("-")[0];
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

function pickCachedVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length > 0 ? cachedVoices : readVoices();
  const prefix = lang.split("-")[0];
  const candidates = voices.filter(
    (voice) => voice.lang === lang || voice.lang.startsWith(prefix),
  );

  return candidates.sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
}

function friendlySpeechError(error: string | undefined, lang: string): string {
  switch (error) {
    case "not-allowed":
      return "Your browser blocked audio. Tap the speaker button again.";
    case "language-unavailable":
      return `No voice is available for ${lang} on this device.`;
    case "voice-unavailable":
      return "The selected voice is unavailable. Trying again may use the browser default.";
    case "audio-hardware":
      return "Your device could not play audio. Check volume, Bluetooth, and silent mode.";
    case "network":
      return "A network voice could not be loaded. Try again or install an offline voice.";
    case "synthesis-unavailable":
      return "Text-to-speech is unavailable in this browser.";
    case "synthesis-failed":
      return "Text-to-speech failed. Try again or use another browser.";
    case "canceled":
    case "interrupted":
      return "Speech was interrupted.";
    default:
      return "Couldn’t play audio. Check volume, silent mode, or browser permissions.";
  }
}

function timeoutMessage(): string {
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
    options.onEvent?.({ status: "unsupported", text, lang, message });
    return Promise.resolve({ ok: false, status: "unsupported", message });
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
      options.onEvent?.({
        status: "timeout",
        text: trimmedText,
        lang,
        message,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
      });
      finish({
        ok: false,
        status: "timeout",
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
      const message = friendlySpeechError(event.error, lang);
      const status = event.error === "canceled" || event.error === "interrupted"
        ? "cancelled"
        : "error";

      options.onEvent?.({
        status,
        text: trimmedText,
        lang,
        message,
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
      options.onEvent?.({ status: "error", text: trimmedText, lang, message });
      finish({ ok: false, status: "error", message });
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
    options.onEvent?.({ status: "unsupported", message });
    return Promise.resolve({ ok: false, status: "unsupported", message });
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
        voiceName: lastVoice?.name,
        voiceLang: lastVoice?.lang,
      });
      finish({
        ok: false,
        status: "timeout",
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
        const message = friendlySpeechError(event.error, item.lang);
        const status = event.error === "canceled" || event.error === "interrupted"
          ? "cancelled"
          : "error";

        options.onEvent?.({
          status,
          text: item.text,
          lang: item.lang,
          message,
          voiceName: voice?.name,
          voiceLang: voice?.lang,
        });

        if (status !== "cancelled") {
          finish({
            ok: false,
            status: "error",
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
        options.onEvent?.({ status: "error", text: item.text, lang: item.lang, message });
        finish({ ok: false, status: "error", message });
        return;
      }
    }

    preloadTtsVoices();
  });
}

/** Get available voices for a language. */
export async function getAvailableVoices(
  lang: string,
): Promise<SpeechSynthesisVoice[]> {
  if (!isTtsSupported()) return [];
  const voices = await ensureVoices();
  const prefix = lang.split("-")[0];
  return voices.filter(
    (voice) => voice.lang === lang || voice.lang.startsWith(prefix),
  );
}
