import "./pages.css";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { TitleBar } from "@/components/window/TitleBar";
import { loginUser } from "@/services/commands/auth";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

// ── Types ──────────────────────────────────────────────────────────────────

interface FieldErrors {
  username?: string;
  password?: string;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validate(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmed = username.trim();

  if (!trimmed) {
    errors.username = "Username is required";
  } else if (trimmed.length < 2) {
    errors.username = "Username must be at least 2 characters";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
}

// ── Logo mark ──────────────────────────────────────────────────────────────

function LexoraLogoMark() {
  return (
    <svg
      className="login-page__logo-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="login-logo-grad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-cyan)" />
        </linearGradient>
      </defs>
      {/* Stylised "L" — vertical stroke + horizontal base */}
      <rect
        x="4"
        y="4"
        width="4"
        height="16"
        rx="1"
        fill="url(#login-logo-grad)"
      />
      <rect
        x="4"
        y="16"
        width="13"
        height="4"
        rx="1"
        fill="url(#login-logo-grad)"
      />
    </svg>
  );
}

// ── LoginPage ──────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading: authLoading, user } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/home", { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const errors = validate(username, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      const result = await loginUser(username.trim(), password);
      login(result);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <TitleBar />

      <div className="login-page__content">
        <motion.div
          className="login-page__card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* Logo mark */}
          <div className="login-page__logo-mark">
            <LexoraLogoMark />
          </div>

          {/* Header */}
          <span className="login-page__wordmark">Lexora</span>
          <h1 className="login-page__title">Welcome back</h1>
          <p className="login-page__subtitle">
            Sign in to continue your learning journey
          </p>

          {/* Form */}
          <form className="login-page__form" onSubmit={handleSubmit} noValidate>
            {/* Username field */}
            <div className="lx-form-group">
              <label className="lx-form-label" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                className={[
                  "lx-input",
                  fieldErrors.username ? "lx-input--error" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      username: undefined,
                    }));
                  }
                }}
                disabled={isLoading}
                autoComplete="username"
                autoFocus
                aria-describedby={
                  fieldErrors.username ? "login-username-error" : undefined
                }
                aria-invalid={fieldErrors.username ? true : undefined}
              />
              {fieldErrors.username && (
                <span
                  id="login-username-error"
                  className="lx-form-error"
                  role="alert"
                >
                  {fieldErrors.username}
                </span>
              )}
            </div>

            {/* Password field */}
            <div className="lx-form-group">
              <label className="lx-form-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className={[
                  "lx-input",
                  fieldErrors.password ? "lx-input--error" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: undefined,
                    }));
                  }
                }}
                disabled={isLoading}
                autoComplete="current-password"
                aria-describedby={
                  fieldErrors.password ? "login-password-error" : undefined
                }
                aria-invalid={fieldErrors.password ? true : undefined}
              />
              {fieldErrors.password && (
                <span
                  id="login-password-error"
                  className="lx-form-error"
                  role="alert"
                >
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* General error */}
            {error && (
              <div className="login-page__error-box" role="alert">
                <AlertCircle
                  className="login-page__error-icon"
                  size={16}
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="login-page__submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="lx-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* First-run hint */}
          <p className="login-page__setup-hint">
            <strong>First time?</strong> Use the default accounts:{" "}
            <strong>owner</strong> or <strong>learner</strong> (password matches
            username).
          </p>
        </motion.div>
      </div>
    </div>
  );
}
