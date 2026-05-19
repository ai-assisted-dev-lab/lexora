import { useCallback, useEffect, useRef, useState } from "react";

import { recordPronunciationPractice } from "@/services/commands/achievements";
import { readCachedAudio } from "@/services/commands/audio";
import type { PronunciationSettings } from "@/services/commands/settings";
import { defaultPronunciationSettings } from "@/services/commands/settings";
import { playTtsFallback, stopBrowserTts } from "@/services/tts";

export type AudioPlayState = "idle" | "loading" | "playing" | "error";

export interface AudioPlayRequest {
  audioPath?: string | null;
  fallbackText?: string | null;
  settings?: PronunciationSettings;
}

function guessMediaType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    case "aac":
      return "audio/aac";
    case "m4a":
      return "audio/mp4";
    default:
      return "audio/mpeg";
  }
}

/**
 * Manages a single audio playback lifecycle with loading and error states.
 *
 * Audio priority:
 *   1. Remote URL  — if `audioPath` starts with http(s)://, plays directly.
 *   2. Local cache — otherwise calls the Rust `read_cached_audio` command,
 *      builds a Blob URL, and plays via the Web Audio API.
 *
 * The Blob URL is revoked automatically when playback ends or the hook
 * unmounts to avoid memory leaks.
 */
export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanUp = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.oncanplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    stopBrowserTts();
  }, []);

  const playLocalAudio = useCallback(async (audioPath: string) => {
    let url: string;

    if (audioPath.startsWith("http://") || audioPath.startsWith("https://")) {
      url = audioPath;
    } else {
      const base64 = await readCachedAudio(audioPath);
      const mediaType = guessMediaType(audioPath);
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: mediaType });
      url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
    }

    const audio = new Audio();
    audioRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      audio.oncanplay = () => {
        setState("playing");
        audio.play().then(resolve).catch(reject);
      };
      audio.onerror = () => reject(new Error("Audio element load error"));
      audio.src = url;
      audio.load();
    });

    audio.onended = () => {
      setState("idle");
      cleanUp();
    };
  }, [cleanUp]);

  const playFallbackTts = useCallback(
    async (text: string, settings: PronunciationSettings) => {
      setState("playing");
      await playTtsFallback(text, settings.audioFallbackBehavior, {
        accent: settings.pronunciationAccent,
        speed: settings.pronunciationSpeed,
      });
      void recordPronunciationPractice().catch(() => undefined);
      setState("idle");
    },
    [],
  );

  const play = useCallback(
    async (request: string | AudioPlayRequest) => {
      cleanUp();
      setState("loading");

      const normalized =
        typeof request === "string" ? { audioPath: request } : request;
      const settings = normalized.settings ?? defaultPronunciationSettings;
      const audioPath = normalized.audioPath;
      const fallbackText = normalized.fallbackText?.trim();

      async function tryFallback() {
        if (!fallbackText) throw new Error("No fallback text available.");
        await playFallbackTts(fallbackText, settings);
      }

      try {
        if (settings.audioPriority === "tts_first" && fallbackText) {
          await tryFallback();
          return;
        }

        if (audioPath) {
          try {
            await playLocalAudio(audioPath);
            void recordPronunciationPractice().catch(() => undefined);
            return;
          } catch {
            cleanUp();
            setState("loading");
          }
        }

        await tryFallback();
      } catch {
        setState("error");
        cleanUp();
      }
    },
    [cleanUp, playFallbackTts, playLocalAudio],
  );

  const stop = useCallback(() => {
    cleanUp();
    setState("idle");
  }, [cleanUp]);

  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, [cleanUp]);

  return { state, play, stop };
}
