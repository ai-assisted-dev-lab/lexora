import "./pages.css";

import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-page__content">
        <ShieldOff
          className="unauthorized-page__icon"
          size={48}
          aria-hidden="true"
        />
        <h2 className="unauthorized-page__title">Access Denied</h2>
        <p className="unauthorized-page__desc">
          This area is restricted to owner accounts. You don&apos;t have
          permission to view this page.
        </p>
        <Link to="/discover" className="unauthorized-page__link">
          Go to Discover
        </Link>
      </div>
    </div>
  );
}
