/**
 * Web Speech API wrapper for text-to-speech.
 * TTS config is derived from FieldMetadata — see types.ts.
 */

/** Ensure voices are loaded (they load async in some browsers). */
function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
  });
}

/** Pick the best voice for a language from the available voices. */
function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | undefined {
  const prefix = lang.split("-")[0];
  const candidates = voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(prefix)
  );
  if (candidates.length === 0) return undefined;
  const enhanced = candidates.find((v) =>
    /enhanced|premium/i.test(v.name)
  );
  const remote = candidates.find((v) => !v.localService);
  return enhanced ?? remote ?? candidates[0];
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

  speechSynthesis.cancel();

  const voices = await ensureVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  const voice = pickVoice(voices, lang);
  if (voice) utterance.voice = voice;

  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

/**
 * Speak multiple texts sequentially, each with its own language.
 * Cancels any ongoing speech before starting.
 */
export async function speakSequence(
  items: { text: string; lang: string }[]
): Promise<void> {
  if (!isTtsSupported() || items.length === 0) return;

  speechSynthesis.cancel();
  const voices = await ensureVoices();

  for (const item of items) {
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = item.lang;

      const voice = pickVoice(voices, item.lang);
      if (voice) utterance.voice = voice;

      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }
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
