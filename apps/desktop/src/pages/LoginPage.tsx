import "./pages.css";

import { TitleBar } from "@/components/window/TitleBar";

export function LoginPage() {
  return (
    <div className="login-page">
      <TitleBar />
      <div className="login-page__content">
        <div className="login-page__card">
          <span className="login-page__wordmark">Lexora</span>
          <h1 className="login-page__title">Welcome back</h1>
          <p className="login-page__subtitle">
            Sign in to continue your learning journey
          </p>
          <div className="login-page__placeholder">
            Authentication will be implemented in a future update
          </div>
        </div>
      </div>
    </div>
  );
}
