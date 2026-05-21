import "./pages.css";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="not-found-page">
      <div className="not-found-page__content">
        <p className="not-found-page__code" aria-hidden="true">
          404
        </p>
        <h1 className="not-found-page__title">{t("errors.notFoundTitle")}</h1>
        <p className="not-found-page__desc">{t("errors.notFoundMessage")}</p>
        <Link to="/discover" className="not-found-page__link">
          {t("errors.backToDiscover")}
        </Link>
      </div>
    </div>
  );
}
