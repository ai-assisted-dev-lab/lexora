import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { ErrorBoundary } from "@/components/feedback";

import { AppShell } from "./AppShell";

function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="lx-error-boundary" role="alert" aria-live="assertive">
      <div className="lx-error-boundary__panel">
        <h1 className="lx-error-boundary__title">{t("errors.routeTitle")}</h1>
        <p className="lx-error-boundary__message">{t("errors.routeMessage")}</p>
        {import.meta.env.DEV && (
          <pre className="lx-error-boundary__details">{error.message}</pre>
        )}
        <div className="lx-error-boundary__actions">
          <button
            type="button"
            className="lx-error-boundary__button lx-error-boundary__button--primary"
            onClick={reset}
          >
            {t("errors.tryAgain")}
          </button>
          <button
            type="button"
            className="lx-error-boundary__button"
            onClick={() => {
              reset();
              navigate("/home");
            }}
          >
            {t("errors.goHome")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShellLayout() {
  const location = useLocation();
  return (
    <AppShell>
      <ErrorBoundary
        key={location.pathname}
        fallback={(error, reset) => (
          <RouteErrorFallback error={error} reset={reset} />
        )}
      >
        <Outlet />
      </ErrorBoundary>
    </AppShell>
  );
}
