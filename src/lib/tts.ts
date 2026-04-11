/**
 * Web Speech API wrapper for text-to-speech.
 * TTS config is derived from FieldMetadata — see types.ts.
 */

let voicesLoaded = false;

/** Ensure voices are loaded (they load async in some browsers). */
function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      voicesLoaded = true;
      resolve(speechSynthesis.getVoices());
    };
  });
}

/** Check if the browser supports speech synthesis. */
export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speak the given text using Web Speech API.
 * @param text - The text to speak
 * @param lang - BCP-47 language tag (e.g., "zh-CN", "es")
 */
export async function speak(text: string, lang: string): Promise<void> {
  if (!isTtsSupported()) return;

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const voices = await ensureVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  // Find voices matching the language, preferring higher-quality ones
  const prefix = lang.split("-")[0];
  const candidates = voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(prefix)
  );
  if (candidates.length > 0) {
    // Prefer enhanced/premium voices (macOS labels them), then non-local
    // (network-synthesised) voices, then fall back to first match
    const enhanced = candidates.find((v) =>
      /enhanced|premium/i.test(v.name)
    );
    const remote = candidates.find((v) => !v.localService);
    utterance.voice = enhanced ?? remote ?? candidates[0];
  }

  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

/** Get available voices for a language. */
export async function getAvailableVoices(
  lang: string
): Promise<SpeechSynthesisVoice[]> {
  if (!isTtsSupported()) return [];
  const voices = await ensureVoices();
  const prefix = lang.split("-")[0];
  return voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(prefix)
  );
}
