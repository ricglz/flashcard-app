import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MutableSpeechSynthesisVoice = SpeechSynthesisVoice & {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
};

type FakeUtterance = SpeechSynthesisUtterance & {
  text: string;
  lang: string;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown) | null;
};

type FakeSpeechSynthesis = SpeechSynthesis & {
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn<() => SpeechSynthesisVoice[]>>;
  spoken: FakeUtterance[];
};

type TtsModule = typeof import("./tts");

const originalNavigatorOnLine = Object.getOwnPropertyDescriptor(
  Navigator.prototype,
  "onLine",
);

function makeVoice(
  overrides: Partial<MutableSpeechSynthesisVoice> & Pick<MutableSpeechSynthesisVoice, "name" | "lang">,
): SpeechSynthesisVoice {
  return {
    voiceURI: overrides.name,
    name: overrides.name,
    lang: overrides.lang,
    localService: overrides.localService ?? true,
    default: overrides.default ?? false,
  } as SpeechSynthesisVoice;
}

function makeSpeechSynthesis(voices: SpeechSynthesisVoice[] = []): FakeSpeechSynthesis {
  const spoken: FakeUtterance[] = [];
  return {
    spoken,
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance as FakeUtterance);
    }),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as FakeSpeechSynthesis;
}

function installSpeechSynthesis({
  voices = [],
  synth = makeSpeechSynthesis(voices),
}: {
  voices?: SpeechSynthesisVoice[];
  synth?: FakeSpeechSynthesis;
} = {}): FakeSpeechSynthesis {
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    writable: true,
    value: synth,
  });
  return synth;
}

function installUtterance() {
  class FakeSpeechSynthesisUtterance {
    text: string;
    lang = "";
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    onstart: FakeUtterance["onstart"] = null;
    onend: FakeUtterance["onend"] = null;
    onerror: FakeUtterance["onerror"] = null;

    constructor(text = "") {
      this.text = text;
    }
  }

  vi.stubGlobal("SpeechSynthesisUtterance", FakeSpeechSynthesisUtterance);
}

function setOnline(value: boolean) {
  Object.defineProperty(Navigator.prototype, "onLine", {
    configurable: true,
    get: () => value,
  });
}

async function importTts(): Promise<TtsModule> {
  vi.resetModules();
  return import("./tts");
}

beforeEach(() => {
  vi.useRealTimers();
  installUtterance();
  installSpeechSynthesis();
  setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalNavigatorOnLine) {
    Object.defineProperty(Navigator.prototype, "onLine", originalNavigatorOnLine);
  }
  vi.resetModules();
});

describe("friendlySpeechError", () => {
  it("maps known browser speech errors to user-facing messages", async () => {
    const { friendlySpeechError } = await importTts();

    expect(friendlySpeechError("not-allowed", "zh-CN")).toEqual({
      kind: "permission_blocked",
      message: "Your browser blocked audio. Tap the speaker button again.",
    });
    expect(friendlySpeechError("language-unavailable", "zh-CN")).toEqual({
      kind: "language_unavailable",
      message: "No voice is available for zh-CN on this device.",
    });
    expect(friendlySpeechError("voice-unavailable", "zh-CN")).toEqual({
      kind: "voice_unavailable",
      message: "The selected voice is unavailable. Trying again may use the browser default.",
    });
    expect(friendlySpeechError("audio-hardware", "zh-CN")).toEqual({
      kind: "audio_hardware",
      message: "Your device could not play audio. Check volume, Bluetooth, and silent mode.",
    });
    expect(friendlySpeechError("network", "zh-CN")).toEqual({
      kind: "network",
      message: "A network voice could not be loaded. Try again or install an offline voice.",
    });
    expect(friendlySpeechError("synthesis-unavailable", "zh-CN")).toEqual({
      kind: "synthesis_unavailable",
      message: "Text-to-speech is unavailable in this browser.",
    });
    expect(friendlySpeechError("synthesis-failed", "zh-CN")).toEqual({
      kind: "synthesis_failed",
      message: "Text-to-speech failed. Try again or use another browser.",
    });
    expect(friendlySpeechError("canceled", "zh-CN")).toEqual({
      kind: "unknown",
      message: "Speech was interrupted.",
    });
    expect(friendlySpeechError("interrupted", "zh-CN")).toEqual({
      kind: "unknown",
      message: "Speech was interrupted.",
    });
  });

  it("returns the generic fallback message for unknown or missing errors", async () => {
    const { friendlySpeechError } = await importTts();

    expect(friendlySpeechError("bad-error", "zh-CN")).toEqual({
      kind: "unknown",
      message: "Couldn’t play audio. Check volume, silent mode, or browser permissions.",
    });
    expect(friendlySpeechError(undefined, "zh-CN")).toEqual({
      kind: "unknown",
      message: "Couldn’t play audio. Check volume, silent mode, or browser permissions.",
    });
  });
});

describe("voice selection", () => {
  it("prefers exact language match over prefix match", async () => {
    const prefixVoice = makeVoice({ name: "Chinese Generic", lang: "zh" });
    const exactVoice = makeVoice({ name: "Chinese Mainland", lang: "zh-CN" });
    installSpeechSynthesis({ voices: [prefixVoice, exactVoice] });
    const { pickCachedVoice } = await importTts();

    expect(pickCachedVoice("zh-CN")).toBe(exactVoice);
  });

  it("treats case-insensitive exact matches as stronger than prefix-only matches", async () => {
    const prefixVoice = makeVoice({ name: "English Prefix", lang: "en-GB" });
    const caseInsensitiveExactVoice = makeVoice({ name: "English Exact", lang: "EN-US" });
    installSpeechSynthesis({ voices: [prefixVoice, caseInsensitiveExactVoice] });
    const { pickCachedVoice } = await importTts();

    expect(pickCachedVoice("en-us")).toBe(caseInsensitiveExactVoice);
  });

  it("prefers enhanced or premium voices when language scores are otherwise similar", async () => {
    const standardVoice = makeVoice({ name: "Spanish Standard", lang: "es-MX" });
    const enhancedVoice = makeVoice({ name: "Spanish Enhanced", lang: "es-ES" });
    installSpeechSynthesis({ voices: [standardVoice, enhancedVoice] });
    const { pickCachedVoice } = await importTts();

    expect(pickCachedVoice("es")).toBe(enhancedVoice);
  });

  it("prefers network voices while online", async () => {
    const localVoice = makeVoice({ name: "French Local", lang: "fr-FR", localService: true });
    const networkVoice = makeVoice({ name: "French Network", lang: "fr-FR", localService: false });
    installSpeechSynthesis({ voices: [localVoice, networkVoice] });
    setOnline(true);
    const { pickCachedVoice } = await importTts();

    expect(pickCachedVoice("fr-FR")).toBe(networkVoice);
  });

  it("prefers local voices while offline", async () => {
    const networkVoice = makeVoice({ name: "German Network", lang: "de-DE", localService: false });
    const localVoice = makeVoice({ name: "German Local", lang: "de-DE", localService: true });
    installSpeechSynthesis({ voices: [networkVoice, localVoice] });
    setOnline(false);
    const { pickCachedVoice } = await importTts();

    expect(pickCachedVoice("de-DE")).toBe(localVoice);
  });

  it("uses the default voice as a final tie-breaker", async () => {
    const nonDefaultVoice = makeVoice({ name: "Italian A", lang: "it-IT", default: false });
    const defaultVoice = makeVoice({ name: "Italian B", lang: "it-IT", default: true });
    installSpeechSynthesis({ voices: [nonDefaultVoice, defaultVoice] });
    const { pickCachedVoice } = await importTts();

    expect(pickCachedVoice("it-IT")).toBe(defaultVoice);
  });
});

describe("empty text handling", () => {
  it("resolves ended without invoking speech synthesis for empty speak text", async () => {
    const synth = installSpeechSynthesis();
    const { speak } = await importTts();
    const onEvent = vi.fn();

    await expect(speak("   ", "en-US", { onEvent })).resolves.toEqual({
      ok: true,
      status: "ended",
    });
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("filters empty sequence items and resolves ended when nothing speakable remains", async () => {
    const synth = installSpeechSynthesis();
    const { speakSequence } = await importTts();
    const onEvent = vi.fn();

    await expect(
      speakSequence([
        { text: "", lang: "en-US" },
        { text: "  ", lang: "zh-CN" },
      ], { onEvent }),
    ).resolves.toEqual({ ok: true, status: "ended" });
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });
});

describe("timeout behavior", () => {
  it("emits and resolves timeout when playback never starts", async () => {
    vi.useFakeTimers();
    const voice = makeVoice({ name: "English Voice", lang: "en-US" });
    installSpeechSynthesis({ voices: [voice] });
    const { speak, timeoutMessage } = await importTts();
    const onEvent = vi.fn();

    const resultPromise = speak("hello", "en-US", { onEvent, startTimeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(10);

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      status: "timeout",
      kind: "timeout",
      message: timeoutMessage(),
      voiceName: "English Voice",
      voiceLang: "en-US",
    });
    expect(onEvent).toHaveBeenCalledWith({
      status: "timeout",
      text: "hello",
      lang: "en-US",
      message: timeoutMessage(),
      kind: "timeout",
      voiceName: "English Voice",
      voiceLang: "en-US",
    });
  });

  it("does not resolve through timeout if playback starts before the timer", async () => {
    vi.useFakeTimers();
    const synth = installSpeechSynthesis();
    const { speak } = await importTts();
    const onEvent = vi.fn();

    const resultPromise = speak("hello", "en-US", { onEvent, startTimeoutMs: 10 });
    synth.spoken[0]!.onstart?.call(synth.spoken[0]!, {} as SpeechSynthesisEvent);
    await vi.advanceTimersByTimeAsync(10);
    synth.spoken[0]!.onend?.call(synth.spoken[0]!, {} as SpeechSynthesisEvent);

    await expect(resultPromise).resolves.toEqual({ ok: true, status: "ended" });
    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "timeout" }),
    );
  });
});

describe("speech flow", () => {
  it("emits preparing, queued, speaking, and ended for a successful utterance", async () => {
    const voice = makeVoice({ name: "English Voice", lang: "en-US" });
    const synth = installSpeechSynthesis({ voices: [voice] });
    const { speak } = await importTts();
    const onEvent = vi.fn();

    const resultPromise = speak(" hello ", "en-US", { rate: 1.2, onEvent });
    const utterance = synth.spoken[0]!;
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(utterance.text).toBe("hello");
    expect(utterance.lang).toBe("en-US");
    expect(utterance.rate).toBe(1.2);
    expect(utterance.voice).toBe(voice);

    utterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
    utterance.onend?.call(utterance, {} as SpeechSynthesisEvent);

    await expect(resultPromise).resolves.toEqual({
      ok: true,
      status: "ended",
      voiceName: "English Voice",
      voiceLang: "en-US",
    });
    expect(onEvent.mock.calls.map(([event]) => event.status)).toEqual([
      "preparing",
      "queued",
      "speaking",
      "ended",
    ]);
  });

  it("resolves canceled and interrupted browser errors as successful cancellation", async () => {
    for (const error of ["canceled", "interrupted"] as const) {
      const synth = installSpeechSynthesis();
      const { speak } = await importTts();
      const onEvent = vi.fn();

      const resultPromise = speak("hello", "en-US", { onEvent });
      synth.spoken[0]!.onerror?.call(synth.spoken[0]!, { error } as SpeechSynthesisErrorEvent);

      await expect(resultPromise).resolves.toEqual({ ok: true, status: "cancelled" });
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ status: "cancelled", message: "Speech was interrupted." }),
      );
    }
  });

  it("resolves other browser speech errors as failed errors", async () => {
    const synth = installSpeechSynthesis();
    const { speak } = await importTts();
    const onEvent = vi.fn();

    const resultPromise = speak("hello", "en-US", { onEvent });
    synth.spoken[0]!.onerror?.call(synth.spoken[0]!, {
      error: "not-allowed",
    } as SpeechSynthesisErrorEvent);

    await expect(resultPromise).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        status: "error",
        kind: "permission_blocked",
        message: "Your browser blocked audio. Tap the speaker button again.",
      }),
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Your browser blocked audio. Tap the speaker button again.",
      }),
    );
  });
});
