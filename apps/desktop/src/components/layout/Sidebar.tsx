import "./Sidebar.css";

import type { LucideIcon } from "lucide-react";
import { BookOpen, ChevronLeft, ChevronRight, Flame, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

import { Card, IconButton } from "@/components/ui";
import { useGamificationSummary } from "@/hooks/useGamificationSummary";
import {
  type RouteConfig,
  SIDEBAR_BOTTOM_ITEMS,
  SIDEBAR_MAIN_ITEMS,
} from "@/router/routes";

const AUTO_COLLAPSE_BREAKPOINT = 1024;

interface SidebarLinkProps {
  path: string;
  label: string;
  Icon?: LucideIcon;
  isCollapsed: boolean;
}

function SidebarLink({ path, label, Icon, isCollapsed }: SidebarLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === path;

  return (
    <NavLink
      to={path}
      className={`sidebar__nav-item${isActive ? " sidebar__nav-item--active" : ""}`}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? label : undefined}
    >
      {Icon && (
        <Icon className="sidebar__nav-icon" size={20} aria-hidden="true" />
      )}
      {!isCollapsed && <span className="sidebar__nav-label">{label}</span>}
    </NavLink>
  );
}

function renderLink(
  route: RouteConfig,
  label: string,
  isCollapsed: boolean,
): JSX.Element {
  return (
    <SidebarLink
      key={route.path}
      path={route.path}
      label={label}
      Icon={route.icon}
      isCollapsed={isCollapsed}
    />
  );
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const summary = useGamificationSummary();
  const { t } = useTranslation();

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < AUTO_COLLAPSE_BREAKPOINT) {
        setIsCollapsed(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const streak = summary?.currentStreak ?? 0;

  return (
    <nav
      className={`sidebar${isCollapsed ? " sidebar--collapsed" : ""}`}
      aria-label={t("nav.mainNavigation")}
    >
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark" aria-hidden="true">
          <BookOpen size={18} />
          <span className="sidebar__brand-badge">L</span>
        </div>
        {!isCollapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__wordmark">{t("app.name")}</span>
            <span className="sidebar__subtitle">
              {t("app.bilingualTagline")}
            </span>
          </div>
        )}
        <IconButton
          className="sidebar__toggle"
          onClick={() => setIsCollapsed((c) => !c)}
          label={
            isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
          }
        >
          {isCollapsed ? (
            <ChevronRight size={14} aria-hidden="true" />
          ) : (
            <ChevronLeft size={14} aria-hidden="true" />
          )}
        </IconButton>
      </div>

      <div className="sidebar__section">
        {SIDEBAR_MAIN_ITEMS.map((route) =>
          renderLink(route, t(route.labelKey), isCollapsed),
        )}
      </div>

      <div className="sidebar__divider" />

      <div className="sidebar__section sidebar__section--bottom">
        {SIDEBAR_BOTTOM_ITEMS.map((route) =>
          renderLink(route, t(route.labelKey), isCollapsed),
        )}

        <Card
          className="sidebar__profile-card"
          data-testid="sidebar-profile"
          title={isCollapsed ? t("user.profileLabel") : undefined}
          variant="compact"
        >
          <div className="sidebar__profile-avatar">
            <User size={14} aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="sidebar__profile-info">
              <span className="sidebar__profile-name">
                {t("user.defaultName")}
              </span>
              <span className="sidebar__profile-streak">
                <Flame size={11} aria-hidden="true" />
                {t("common.dayStreak", { count: streak })}
              </span>
            </div>
          )}
        </Card>
      </div>
    </nav>
  );
}
