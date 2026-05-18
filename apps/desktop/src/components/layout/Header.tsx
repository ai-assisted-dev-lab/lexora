import "./Header.css";

import { Bell } from "lucide-react";
import { useLocation } from "react-router-dom";

import { getPageLabel } from "@/router/routes";

import { SearchBar } from "./SearchBar";
import { UserProfile } from "./UserProfile";

interface NotificationButtonProps {
  count?: number;
}

function NotificationButton({ count = 0 }: NotificationButtonProps) {
  return (
    <div className="page-header__notif">
      <button
        className="page-header__icon-btn"
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        title="Notifications"
      >
        <Bell size={20} aria-hidden="true" />
      </button>
      {count > 0 && (
        <span className="page-header__badge" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </div>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const title = getPageLabel(pathname);

  return (
    <div className="page-header" aria-label="Page header">
      <h1 className="page-header__title">{title}</h1>

      <SearchBar />

      <div className="page-header__actions">
        <NotificationButton count={0} />
        <UserProfile />
      </div>
    </div>
  );
}
