import { invoke } from "@/services/tauri";

/** Mirrors the Rust `LoginResultDto` that will be returned by `login_user`. */
export interface LoginResult {
  userId: number;
  username: string;
  role: "owner" | "learner";
}

/**
 * Sends credentials to the Rust `login_user` command.
 *
 * The command is not yet registered in the backend — it will be implemented
 * in the authentication milestone.  Until then this call will reject with a
 * Tauri "Command not found" error, which the login form surfaces as an error
 * message.  When the backend command ships, no changes are needed here.
 */
export function loginUser(
  username: string,
  password: string,
): Promise<LoginResult> {
  return invoke<LoginResult>("login_user", { username, password });
}
