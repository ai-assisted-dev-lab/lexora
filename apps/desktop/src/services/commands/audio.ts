import { invoke } from "@tauri-apps/api/core";

export interface AudioCacheStatusDto {
  relativePath: string;
  cached: boolean;
  absolutePath: string | null;
  fileSizeBytes: number | null;
}

/** Returns the absolute path to the audio cache directory (created on demand). */
export function getAudioCachePath(): Promise<string> {
  return invoke<string>("get_audio_cache_path");
}

/** Checks whether a relative audio path exists in the local cache. */
export function checkAudioCached(
  relativePath: string,
): Promise<AudioCacheStatusDto> {
  return invoke<AudioCacheStatusDto>("check_audio_cached", { relativePath });
}

/**
 * Reads a cached audio file and returns its content as a base64-encoded string.
 *
 * The caller converts this to a Blob URL for Web Audio playback:
 * ```ts
 * const b64 = await readCachedAudio(path);
 * const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
 * const blob = new Blob([bytes], { type: "audio/mpeg" });
 * const url  = URL.createObjectURL(blob);
 * ```
 *
 * Throws `{ kind: "NotFound", message: "..." }` when the file is absent.
 */
export function readCachedAudio(relativePath: string): Promise<string> {
  return invoke<string>("read_cached_audio", { relativePath });
}
