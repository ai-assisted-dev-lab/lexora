import "./Header.css";

import { Bell } from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

import { CommandPalette } from "@/components/command/CommandPalette";
import { Badge, IconButton, PageHeader } from "@/components/ui";
import { getPageLabel } from "@/router/routes";

import { NotificationCenter } from "./NotificationCenter";
import { SearchBar } from "./SearchBar";
import { UserProfile } from "./UserProfile";

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  const handleCountChange = useCallback((next: number) => {
    setCount(next);
  }, []);

  return (
    <div className="page-header__notif">
      <IconButton
        label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        title="Notifications"
        onClick={() => setOpen((prev) => !prev)}
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
      <NotificationCenter
        open={open}
        onClose={() => setOpen(false)}
        onCountChange={handleCountChange}
      />
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
        <NotificationButton />
        <UserProfile />
      </div>

      <CommandPalette />
    </PageHeader>
  );
}
