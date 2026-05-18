import "./pages.css";

import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-page__content">
        <p className="not-found-page__code" aria-hidden="true">
          404
        </p>
        <h1 className="not-found-page__title">Page not found</h1>
        <p className="not-found-page__desc">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link to="/discover" className="not-found-page__link">
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
