import "./pages.css";

import type { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  Icon?: LucideIcon;
}

export function PlaceholderPage({
  title,
  description,
  Icon,
}: PlaceholderPageProps) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-page__content">
        {Icon && (
          <div className="placeholder-page__icon">
            <Icon size={48} aria-hidden="true" />
          </div>
        )}
        <h2 className="placeholder-page__title">{title}</h2>
        <p className="placeholder-page__desc">{description}</p>
      </div>
    </div>
  );
}
