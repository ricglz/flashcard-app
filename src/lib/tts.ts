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

  // Try to find a voice matching the language
  const matchingVoice =
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split("-")[0]));

  if (matchingVoice) {
    utterance.voice = matchingVoice;
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
