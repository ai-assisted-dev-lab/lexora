import "./Header.css";

import { Bell } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Badge, IconButton, PageHeader } from "@/components/ui";
import { getPageLabel } from "@/router/routes";

import { SearchBar } from "./SearchBar";
import { UserProfile } from "./UserProfile";

interface NotificationButtonProps {
  count?: number;
}

function NotificationButton({ count = 0 }: NotificationButtonProps) {
  return (
    <div className="page-header__notif">
      <IconButton
        label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        title="Notifications"
      >
        <Bell size={20} aria-hidden="true" />
      </IconButton>
      {count > 0 && (
        <Badge
          className="page-header__badge"
          variant="danger"
          aria-hidden="true"
        >
          {count > 9 ? "9+" : count}
        </Badge>
      )}
    </div>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const title = getPageLabel(pathname);

  return (
    <PageHeader className="page-header" aria-label="Page header">
      <h1 className="page-header__title">{title}</h1>

      <SearchBar />

      <div className="page-header__actions">
        <NotificationButton count={0} />
        <UserProfile />
      </div>
    </PageHeader>
  );
}
