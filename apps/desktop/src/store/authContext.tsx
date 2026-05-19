import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { getCurrentSession, logoutUser } from "@/services/commands/auth";
import type { LoginResult } from "@/services/commands/auth";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: number;
  username: string;
  role: "owner" | "learner";
}

export interface AuthContextValue {
  /** The currently authenticated user, or `null` if not signed in. */
  user: AuthUser | null;
  /**
   * `true` while the initial session check is in flight.  Components that
   * guard access should render a loading state (or nothing) until this
   * resolves, to prevent a flash-of-wrong-page.
   */
  isLoading: boolean;
  /** Called by the login page after a successful `login_user` command. */
  login: (result: LoginResult) => void;
  /** Calls `logout_user`, clears local state, and resolves when done. */
  logout: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────

/**
 * Exported so tests can inject a pre-configured value directly via
 * `<AuthContext.Provider value={...}>` without mounting `AuthProvider`.
 */
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
  login: () => {},
  logout: async () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides auth state to the whole app.  On mount it calls
 * `get_current_session` to restore a persisted session without requiring the
 * user to re-enter their password after every app restart.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        if (session) {
          setUser({
            userId: session.userId,
            username: session.username,
            role: session.role as "owner" | "learner",
          });
        }
      })
      .catch(() => {
        // Not in a Tauri runtime (browser dev preview, test environment, or
        // command not yet registered) — treat as unauthenticated.
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback((result: LoginResult) => {
    setUser({
      userId: result.userId,
      username: result.username,
      role: result.role as "owner" | "learner",
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore errors from the backend (e.g. already logged out).
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

/** Returns the current auth context.  Must be called within `AuthProvider`. */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
