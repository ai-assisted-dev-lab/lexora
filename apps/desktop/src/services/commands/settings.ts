import { invoke } from "@/services/tauri";

export type PronunciationAccent = "us" | "uk" | "neutral";
export type AudioPriority = "local_first" | "tts_first";
export type AudioFallbackBehavior =
  | "browser_tts"
  | "online_then_browser"
  | "disabled";

export interface PronunciationSettings {
  userId: number;
  audioAutoplay: boolean;
  pronunciationAccent: PronunciationAccent;
  pronunciationSpeed: number;
  audioPriority: AudioPriority;
  audioFallbackBehavior: AudioFallbackBehavior;
  updatedAt: string;
}

export interface UpdatePronunciationSettingsInput {
  audioAutoplay: boolean;
  pronunciationAccent: PronunciationAccent;
  pronunciationSpeed: number;
  audioPriority: AudioPriority;
  audioFallbackBehavior: AudioFallbackBehavior;
}

export const defaultPronunciationSettings: PronunciationSettings = {
  userId: 0,
  audioAutoplay: true,
  pronunciationAccent: "us",
  pronunciationSpeed: 1,
  audioPriority: "local_first",
  audioFallbackBehavior: "browser_tts",
  updatedAt: "",
};

export function getPronunciationSettings(): Promise<PronunciationSettings> {
  return invoke<PronunciationSettings>("get_pronunciation_settings");
}

export function updatePronunciationSettings(
  input: UpdatePronunciationSettingsInput,
): Promise<PronunciationSettings> {
  return invoke<PronunciationSettings>("update_pronunciation_settings", {
    input,
  });
}
