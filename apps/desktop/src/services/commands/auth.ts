import { invoke } from "@/services/tauri";

/** Mirrors the Rust `LoginResultDto` serialised over the IPC bridge. */
export interface LoginResult {
  userId: number;
  username: string;
  role: "owner" | "learner";
}

export function loginUser(
  username: string,
  password: string,
): Promise<LoginResult> {
  return invoke<LoginResult>("login_user", { username, password });
}

export function logoutUser(): Promise<void> {
  return invoke<void>("logout_user");
}

export function getCurrentSession(): Promise<LoginResult | null> {
  return invoke<LoginResult | null>("get_current_session");
}

export function initDefaultAccounts(): Promise<void> {
  return invoke<void>("init_default_accounts");
}
