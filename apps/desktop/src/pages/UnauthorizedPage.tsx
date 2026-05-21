import "./pages.css";

import { ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  const { t } = useTranslation();
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-page__content">
        <ShieldOff
          className="unauthorized-page__icon"
          size={48}
          aria-hidden="true"
        />
        <h2 className="unauthorized-page__title">
          {t("errors.unauthorizedTitle")}
        </h2>
        <p className="unauthorized-page__desc">
          {t("errors.unauthorizedDescription")}
        </p>
        <Link to="/discover" className="unauthorized-page__link">
          {t("errors.goToDiscover")}
        </Link>
      </div>
    </div>
  );
}
