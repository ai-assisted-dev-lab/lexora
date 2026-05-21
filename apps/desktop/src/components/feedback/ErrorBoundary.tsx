import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultErrorFallback error={error} reset={this.reset} />;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps) {
  const { t } = useTranslation();
  return (
    <div className="lx-error-boundary" role="alert" aria-live="assertive">
      <div className="lx-error-boundary__panel">
        <h1 className="lx-error-boundary__title">{t("errors.pageTitle")}</h1>
        <p className="lx-error-boundary__message">{t("errors.pageMessage")}</p>
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
            onClick={() => window.location.reload()}
          >
            {t("errors.reloadApp")}
          </button>
        </div>
      </div>
    </div>
  );
}
