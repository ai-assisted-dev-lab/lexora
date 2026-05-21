import "./Header.css";

import { Bell } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { CommandPalette } from "@/components/command/CommandPalette";
import { Badge, IconButton, PageHeader } from "@/components/ui";
import { getPageLabel } from "@/router/routes";
import { useAuth } from "@/store/authContext";

import { NotificationCenter } from "./NotificationCenter";
import { SearchBar } from "./SearchBar";
import { UserProfile } from "./UserProfile";

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const { t } = useTranslation();

  const handleCountChange = useCallback((next: number) => {
    setCount(next);
  }, []);

  const baseLabel = t("notifications.ariaLabel");
  const buttonLabel =
    count > 0 ? t("notifications.unreadCount", { count }) : baseLabel;

  return (
    <div className="page-header__notif">
      <IconButton
        label={buttonLabel}
        title={baseLabel}
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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const title = getPageLabel(pathname);
  void i18n.language; // ensures component re-renders on language change

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <PageHeader
      className="page-header"
      aria-label={t("notifications.pageHeader")}
    >
      <h1 className="page-header__title">{title}</h1>

      <SearchBar />

      <div className="page-header__actions">
        <NotificationButton />
        <UserProfile
          name={user?.username ?? t("user.defaultName")}
          role={user?.role ?? "learner"}
          onLogout={handleLogout}
        />
      </div>

      <CommandPalette />
    </PageHeader>
  );
}
