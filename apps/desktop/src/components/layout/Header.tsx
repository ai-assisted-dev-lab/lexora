import "./Header.css";

import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <div className="page-header" aria-label="Page header">
      <h1 className="page-header__title">Discover</h1>

      <div className="page-header__search" role="search">
        <Search size={16} aria-hidden="true" />
        <input
          className="page-header__search-input"
          type="search"
          placeholder="Search decks and words…"
          aria-label="Search decks and words"
        />
      </div>

      <div className="page-header__actions">
        <button
          className="page-header__icon-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} aria-hidden="true" />
        </button>

        <div
          className="page-header__avatar"
          role="button"
          aria-label="User menu"
          tabIndex={0}
        >
          U
        </div>
      </div>
    </div>
  );
}
