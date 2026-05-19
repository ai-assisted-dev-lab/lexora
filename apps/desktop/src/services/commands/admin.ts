import { invoke } from "@/services/tauri";

/** Mirrors `AdminStatsDto` from the Rust command layer. */
export interface AdminStats {
  userCount: number;
  wordCount: number;
  deckCount: number;
  packCount: number;
}

/** Owner-only: throws `AppError::Unauthorized` for learner sessions. */
export function getAdminStats(): Promise<AdminStats> {
  return invoke<AdminStats>("get_admin_stats");
}
