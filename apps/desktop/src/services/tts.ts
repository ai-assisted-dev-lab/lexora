import type {
  AudioFallbackBehavior,
  PronunciationAccent,
} from "@/services/commands/settings";

export interface TtsPlaybackOptions {
  accent: PronunciationAccent;
  speed: number;
}

export interface OnlineTtsRequest extends TtsPlaybackOptions {
  text: string;
}

export interface OnlineTtsProvider {
  readonly id: string;
  synthesize(request: OnlineTtsRequest): Promise<Blob>;
}

const onlineProviders = new Map<string, OnlineTtsProvider>();

export function registerOnlineTtsProvider(provider: OnlineTtsProvider): void {
  onlineProviders.set(provider.id, provider);
}

function voiceMatchesAccent(
  voice: SpeechSynthesisVoice,
  accent: PronunciationAccent,
): boolean {
  const lang = voice.lang.toLowerCase();
  if (accent === "uk") return lang.includes("en-gb");
  if (accent === "us") return lang.includes("en-us");
  return lang.startsWith("en");
}

function chooseVoice(accent: PronunciationAccent): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voiceMatchesAccent(voice, accent)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function speakWithBrowserTts(
  text: string,
  options: TtsPlaybackOptions,
): Promise<void> {
  if (
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) {
    return Promise.reject(new Error("Browser TTS is not available."));
  }

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      options.accent === "uk"
        ? "en-GB"
        : options.accent === "us"
          ? "en-US"
          : "en";
    utterance.rate = options.speed;
    utterance.voice = chooseVoice(options.accent);
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Browser TTS playback failed."));

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopBrowserTts(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export async function synthesizeOnlineTts(
  request: OnlineTtsRequest,
): Promise<Blob | null> {
  for (const provider of onlineProviders.values()) {
    const audio = await provider.synthesize(request);
    if (audio.size > 0) return audio;
  }
  return null;
}

export async function playTtsFallback(
  text: string,
  fallbackBehavior: AudioFallbackBehavior,
  options: TtsPlaybackOptions,
): Promise<void> {
  if (fallbackBehavior === "disabled") {
    throw new Error("TTS fallback is disabled.");
  }

  if (fallbackBehavior === "online_then_browser") {
    const onlineAudio = await synthesizeOnlineTts({ text, ...options });
    if (onlineAudio) {
      const url = URL.createObjectURL(onlineAudio);
      try {
        const audio = new Audio(url);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () =>
            reject(new Error("Online TTS playback failed."));
          audio.play().catch(reject);
        });
        return;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }

  await speakWithBrowserTts(text, options);
}
