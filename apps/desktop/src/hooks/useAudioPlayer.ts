import { useCallback, useEffect, useRef, useState } from "react";

import { readCachedAudio } from "@/services/commands/audio";

export type AudioPlayState = "idle" | "loading" | "playing" | "error";

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
  }, []);

  const play = useCallback(
    async (audioPath: string) => {
      cleanUp();
      setState("loading");

      try {
        let url: string;

        if (
          audioPath.startsWith("http://") ||
          audioPath.startsWith("https://")
        ) {
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
      } catch {
        setState("error");
        cleanUp();
      }
    },
    [cleanUp],
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
